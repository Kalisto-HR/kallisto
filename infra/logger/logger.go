package logger

import (
	"context"
	"fmt"

	"go.uber.org/zap"
)

var Global *zap.Logger

func Init() error {
	Global, err := zap.NewProduction()

	if err != nil {

		return fmt.Errorf("can't initialize zap logger: %v", err)
	}

	zap.ReplaceGlobals(Global)
	zap.L().Info("Successfully initialized Global Logger")

	return nil
}

func LoggerFromContext(ctx context.Context) *zap.Logger {
	log := zap.L()
	if requestId, ok := ctx.Value("RequestID").(string); ok {
		log = log.With(zap.String("RequestID", requestId))
	}

	return log
}
