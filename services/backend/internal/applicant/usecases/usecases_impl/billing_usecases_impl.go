package usecases_impl

import (
	"context"
	"errors"
	"fmt"
	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/services/backend/internal/applicant/models"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

const premiumRequiredCode = "PREMIUM_REQUIRED"

func ListBillingProducts(ctx context.Context) ([]models.BillingProduct, error) {
	conn, err := middlewares.GetDBFromContext(ctx, middlewares.CtxPostgresKey)
	if err != nil {
		return nil, err
	}

	rows, err := conn.Query(ctx, `
		SELECT id, product_type, name, description, credits, price_amount, currency, interval, interval_count, active, metadata
		FROM billing_products
		WHERE active = TRUE
		ORDER BY price_amount ASC`)
	if err != nil {
		return nil, fmt.Errorf("failed to query billing products: %s", err.Error())
	}
	defer rows.Close()

	products := make([]models.BillingProduct, 0)
	for rows.Next() {
		var item models.BillingProduct
		if err := rows.Scan(
			&item.Id,
			&item.ProductType,
			&item.Name,
			&item.Description,
			&item.Credits,
			&item.PriceAmount,
			&item.Currency,
			&item.Interval,
			&item.IntervalCount,
			&item.Active,
			&item.Metadata,
		); err != nil {
			return nil, fmt.Errorf("failed to scan billing product: %s", err.Error())
		}
		products = append(products, item)
	}
	return products, rows.Err()
}

func GetBillingSummary(ctx context.Context, userId string) (*models.BillingSummary, error) {
	conn, err := middlewares.GetDBFromContext(ctx, middlewares.CtxPostgresKey)
	if err != nil {
		return nil, err
	}

	products, err := ListBillingProducts(ctx)
	if err != nil {
		return nil, err
	}
	orders, err := listBillingOrders(ctx, userId, 20)
	if err != nil {
		return nil, err
	}
	history, err := ListCreditHistory(ctx, userId, 30)
	if err != nil {
		return nil, err
	}
	subscription, err := GetCurrentSubscription(ctx, userId)
	if err != nil {
		return nil, err
	}

	summary := &models.BillingSummary{
		Products:      products,
		Orders:        orders,
		CreditHistory: history,
		Subscription:  subscription,
	}
	summary.HasActivePremium = subscriptionHasActivePremium(subscription, time.Now().UTC())
	if len(history) > 0 {
		summary.CreditBalance = history[0].BalanceAfter
	}
	for _, entry := range history {
		if entry.TransactionType == "purchase" && entry.CreditChange > 0 {
			summary.CreditsPurchased += entry.CreditChange
		}
		if entry.TransactionType == "application_submission" && entry.CreditChange < 0 {
			summary.CreditsUsed += -entry.CreditChange
		}
	}
	if err := conn.QueryRow(ctx, "SELECT COUNT(*) FROM applications WHERE user_id=$1 AND status='draft'", userId).Scan(&summary.DraftApplications); err != nil {
		return nil, fmt.Errorf("failed to count draft applications: %s", err.Error())
	}
	if err := conn.QueryRow(ctx, "SELECT COUNT(*) FROM applications WHERE user_id=$1 AND status <> 'draft'", userId).Scan(&summary.SubmittedApplications); err != nil {
		return nil, fmt.Errorf("failed to count submitted applications: %s", err.Error())
	}
	return summary, nil
}

func CreateBillingOrder(ctx context.Context, userId, productId string) (*models.BillingOrder, error) {
	conn, err := middlewares.GetDBFromContext(ctx, middlewares.CtxPostgresKey)
	if err != nil {
		return nil, err
	}

	productId = strings.TrimSpace(productId)
	product, err := getBillingProduct(ctx, productId)
	if err != nil {
		return nil, err
	}

	orderType := "application_credit"
	if product.ProductType == "subscription" {
		orderType = "subscription"
	}

	var order models.BillingOrder
	err = conn.QueryRow(ctx, `
		INSERT INTO billing_orders (
			user_id, product_id, order_number, order_type, quantity, unit_price, total_amount, currency, status, payment_provider
		) VALUES ($1, $2, 'KAL-' || upper(replace(uuid_generate_v4()::text, '-', '')), $3, 1, $4, $4, $5, 'pending', $6)
		RETURNING id, user_id, product_id, order_number, order_type, quantity, unit_price, total_amount, currency, status, payment_provider, paid_at, created_at, updated_at, metadata`,
		userId,
		product.Id,
		orderType,
		product.PriceAmount,
		product.Currency,
		paymentProviderName(),
	).Scan(
		&order.Id,
		&order.UserId,
		&order.ProductId,
		&order.OrderNumber,
		&order.OrderType,
		&order.Quantity,
		&order.UnitPrice,
		&order.TotalAmount,
		&order.Currency,
		&order.Status,
		&order.PaymentProvider,
		&order.PaidAt,
		&order.CreatedAt,
		&order.UpdatedAt,
		&order.Metadata,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create billing order: %s", err.Error())
	}
	return &order, nil
}

func CompleteDevelopmentPayment(ctx context.Context, userId, orderId string) (*models.BillingOrder, error) {
	if strings.EqualFold(strings.TrimSpace(os.Getenv("APP_ENV")), "production") {
		return nil, utils.NewHandlerFuncErr(http.StatusServiceUnavailable, "production payment provider is not configured")
	}

	conn, err := middlewares.GetDBFromContext(ctx, middlewares.CtxPostgresKey)
	if err != nil {
		return nil, err
	}

	tx, err := conn.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to start payment transaction: %s", err.Error())
	}
	defer tx.Rollback(ctx)

	var order models.BillingOrder
	var product models.BillingProduct
	err = tx.QueryRow(ctx, `
		SELECT o.id, o.user_id, o.product_id, o.order_number, o.order_type, o.quantity, o.unit_price, o.total_amount,
		       o.currency, o.status, o.payment_provider, o.paid_at, o.created_at, o.updated_at, o.metadata,
		       p.id, p.product_type, p.name, p.description, p.credits, p.price_amount, p.currency, p.interval, p.interval_count, p.active, p.metadata
		FROM billing_orders o
		JOIN billing_products p ON p.id = o.product_id
		WHERE o.id = $1 AND o.user_id = $2
		FOR UPDATE`,
		orderId,
		userId,
	).Scan(
		&order.Id, &order.UserId, &order.ProductId, &order.OrderNumber, &order.OrderType, &order.Quantity,
		&order.UnitPrice, &order.TotalAmount, &order.Currency, &order.Status, &order.PaymentProvider, &order.PaidAt,
		&order.CreatedAt, &order.UpdatedAt, &order.Metadata,
		&product.Id, &product.ProductType, &product.Name, &product.Description, &product.Credits, &product.PriceAmount,
		&product.Currency, &product.Interval, &product.IntervalCount, &product.Active, &product.Metadata,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, utils.NewHandlerFuncErr(http.StatusNotFound, "order not found")
		}
		return nil, fmt.Errorf("failed to load billing order: %s", err.Error())
	}
	if order.Status == "paid" {
		if err := tx.Commit(ctx); err != nil {
			return nil, fmt.Errorf("failed to commit idempotent payment check: %s", err.Error())
		}
		return &order, nil
	}
	if order.Status != "pending" {
		return nil, utils.NewHandlerFuncErr(http.StatusBadRequest, "order is not payable")
	}

	_, err = tx.Exec(ctx, `
		UPDATE billing_orders SET status='paid', paid_at=NOW(), updated_at=NOW()
		WHERE id=$1 AND status='pending'`,
		order.Id,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to mark order paid: %s", err.Error())
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO payment_transactions (
			order_id, user_id, provider, provider_transaction_id, transaction_type, amount, currency, status, confirmed_at
		) VALUES ($1, $2, $3, $4, 'payment', $5, $6, 'paid', NOW())
		ON CONFLICT (provider, provider_transaction_id) DO NOTHING`,
		order.Id,
		userId,
		order.PaymentProvider,
		"dev-"+order.Id,
		order.TotalAmount,
		order.Currency,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to record payment transaction: %s", err.Error())
	}

	if product.ProductType == "application_credit" {
		if _, err = addCreditLedgerEntryTx(ctx, tx, userId, "purchase", product.Credits, "order", &order.Id, nil, "Application credits purchased"); err != nil {
			return nil, err
		}
	} else if product.ProductType == "subscription" {
		periodEnd := time.Now().UTC().AddDate(0, 1, 0)
		if product.Interval != nil && *product.Interval == "month" && product.IntervalCount != nil {
			periodEnd = time.Now().UTC().AddDate(0, *product.IntervalCount, 0)
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO user_subscriptions (
				user_id, plan_id, status, starts_at, current_period_start, current_period_end, payment_provider
			) VALUES ($1, $2, 'active', NOW(), NOW(), $3, $4)
			ON CONFLICT (user_id, plan_id) DO UPDATE SET
				status='active',
				current_period_start=NOW(),
				current_period_end=EXCLUDED.current_period_end,
				cancel_at_period_end=FALSE,
				cancelled_at=NULL,
				updated_at=NOW()`,
			userId,
			product.Id,
			periodEnd,
			order.PaymentProvider,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to activate premium subscription: %s", err.Error())
		}
	}

	_, _ = tx.Exec(ctx, `
		INSERT INTO application_notifications (user_id, application_id, university_id, event_type, title, description, action_url)
		SELECT $1, a.id, a.university_id, $2, $3, $4, '/applicant/billing'
		FROM applications a
		WHERE a.user_id = $1
		ORDER BY a.created_at DESC
		LIMIT 1
		ON CONFLICT (application_id, event_type) DO NOTHING`,
		userId,
		"billing_order_paid_"+order.Id,
		"Payment successful",
		"Your Kallisto billing purchase has been confirmed.",
	)

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit payment transaction: %s", err.Error())
	}

	orders, err := listBillingOrders(ctx, userId, 1)
	if err != nil || len(orders) == 0 {
		return &order, err
	}
	return &orders[0], nil
}

func ListCreditHistory(ctx context.Context, userId string, limit int) ([]models.CreditLedgerEntry, error) {
	conn, err := middlewares.GetDBFromContext(ctx, middlewares.CtxPostgresKey)
	if err != nil {
		return nil, err
	}
	if limit < 1 || limit > 100 {
		limit = 30
	}
	rows, err := conn.Query(ctx, `
		SELECT id, user_id, transaction_type, credit_change, balance_after, source_type, source_id, application_id, description, created_at, metadata
		FROM application_credit_ledger
		WHERE user_id=$1
		ORDER BY created_at DESC
		LIMIT $2`,
		userId,
		limit,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query credit history: %s", err.Error())
	}
	defer rows.Close()

	items := make([]models.CreditLedgerEntry, 0)
	for rows.Next() {
		var item models.CreditLedgerEntry
		if err := rows.Scan(&item.Id, &item.UserId, &item.TransactionType, &item.CreditChange, &item.BalanceAfter, &item.SourceType, &item.SourceId, &item.ApplicationId, &item.Description, &item.CreatedAt, &item.Metadata); err != nil {
			return nil, fmt.Errorf("failed to scan credit history: %s", err.Error())
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func GetCurrentSubscription(ctx context.Context, userId string) (*models.Subscription, error) {
	conn, err := middlewares.GetDBFromContext(ctx, middlewares.CtxPostgresKey)
	if err != nil {
		return nil, err
	}
	row := conn.QueryRow(ctx, `
		SELECT id, user_id, plan_id, status, starts_at, current_period_start, current_period_end,
		       cancel_at_period_end, cancelled_at, payment_provider, created_at, updated_at, metadata
		FROM user_subscriptions
		WHERE user_id=$1
		ORDER BY current_period_end DESC
		LIMIT 1`,
		userId,
	)
	var item models.Subscription
	if err := row.Scan(&item.Id, &item.UserId, &item.PlanId, &item.Status, &item.StartsAt, &item.CurrentPeriodStart, &item.CurrentPeriodEnd, &item.CancelAtPeriodEnd, &item.CancelledAt, &item.PaymentProvider, &item.CreatedAt, &item.UpdatedAt, &item.Metadata); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to query subscription: %s", err.Error())
	}
	return &item, nil
}

func HasActivePremium(ctx context.Context, userId string) (bool, error) {
	subscription, err := GetCurrentSubscription(ctx, userId)
	if err != nil || subscription == nil {
		return false, err
	}
	return subscriptionHasActivePremium(subscription, time.Now().UTC()), nil
}

func RequirePremium(ctx context.Context, userId string) error {
	ok, err := HasActivePremium(ctx, userId)
	if err != nil {
		return err
	}
	if !ok {
		return utils.NewHandlerFuncErr(http.StatusPaymentRequired, premiumRequiredCode)
	}
	return nil
}

func subscriptionHasActivePremium(subscription *models.Subscription, now time.Time) bool {
	if subscription == nil {
		return false
	}
	return subscription.Status == "active" &&
		!subscription.StartsAt.After(now) &&
		subscription.CurrentPeriodEnd.After(now)
}

func getBillingProduct(ctx context.Context, productId string) (*models.BillingProduct, error) {
	conn, err := middlewares.GetDBFromContext(ctx, middlewares.CtxPostgresKey)
	if err != nil {
		return nil, err
	}
	row := conn.QueryRow(ctx, `
		SELECT id, product_type, name, description, credits, price_amount, currency, interval, interval_count, active, metadata
		FROM billing_products
		WHERE id=$1 AND active=TRUE`,
		productId,
	)
	var item models.BillingProduct
	if err := row.Scan(&item.Id, &item.ProductType, &item.Name, &item.Description, &item.Credits, &item.PriceAmount, &item.Currency, &item.Interval, &item.IntervalCount, &item.Active, &item.Metadata); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, utils.NewHandlerFuncErr(http.StatusNotFound, "billing product not found")
		}
		return nil, fmt.Errorf("failed to query billing product: %s", err.Error())
	}
	return &item, nil
}

func listBillingOrders(ctx context.Context, userId string, limit int) ([]models.BillingOrder, error) {
	conn, err := middlewares.GetDBFromContext(ctx, middlewares.CtxPostgresKey)
	if err != nil {
		return nil, err
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	rows, err := conn.Query(ctx, `
		SELECT id, user_id, product_id, order_number, order_type, quantity, unit_price, total_amount, currency, status, payment_provider, paid_at, created_at, updated_at, metadata
		FROM billing_orders
		WHERE user_id=$1
		ORDER BY created_at DESC
		LIMIT $2`,
		userId,
		limit,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query billing orders: %s", err.Error())
	}
	defer rows.Close()

	orders := make([]models.BillingOrder, 0)
	for rows.Next() {
		var order models.BillingOrder
		if err := rows.Scan(&order.Id, &order.UserId, &order.ProductId, &order.OrderNumber, &order.OrderType, &order.Quantity, &order.UnitPrice, &order.TotalAmount, &order.Currency, &order.Status, &order.PaymentProvider, &order.PaidAt, &order.CreatedAt, &order.UpdatedAt, &order.Metadata); err != nil {
			return nil, fmt.Errorf("failed to scan billing order: %s", err.Error())
		}
		orders = append(orders, order)
	}
	return orders, rows.Err()
}

func addCreditLedgerEntryTx(ctx context.Context, tx pgx.Tx, userId, transactionType string, creditChange int, sourceType string, sourceId *string, applicationId *string, description string) (string, error) {
	var currentBalance int
	err := tx.QueryRow(ctx, `
		SELECT COALESCE((
			SELECT balance_after
			FROM application_credit_ledger
			WHERE user_id=$1
			ORDER BY created_at DESC, id DESC
			LIMIT 1
		), 0)`,
		userId,
	).Scan(&currentBalance)
	if err != nil {
		return "", fmt.Errorf("failed to read credit balance: %s", err.Error())
	}
	nextBalance := currentBalance + creditChange
	if nextBalance < 0 {
		return "", utils.NewHandlerFuncErr(http.StatusPaymentRequired, "APPLICATION_CREDIT_REQUIRED")
	}
	var id string
	if err := tx.QueryRow(ctx, `
		INSERT INTO application_credit_ledger (
			user_id, transaction_type, credit_change, balance_after, source_type, source_id, application_id, description
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id`,
		userId,
		transactionType,
		creditChange,
		nextBalance,
		sourceType,
		sourceId,
		applicationId,
		description,
	).Scan(&id); err != nil {
		return "", fmt.Errorf("failed to create credit ledger entry: %s", err.Error())
	}
	return id, nil
}

func paymentProviderName() string {
	provider := strings.TrimSpace(os.Getenv("PAYMENT_PROVIDER"))
	if provider != "" {
		return provider
	}
	if strings.EqualFold(strings.TrimSpace(os.Getenv("APP_ENV")), "production") {
		return "unconfigured"
	}
	return "development_mock"
}
