import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";
import { ErrorState, LoadingState, EmptyState } from "../../components/common/PageState";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { fetchStaffStudents, type StaffStudentItem, type StaffStudentsQuery } from "../../services/staff/studentsService";
import { sortedRegionOptions, translateRegionCode } from "../../i18n/regions";

const pageSize = 20;

function formatDate(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" }).format(date);
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "blocked" || status === "suspended") return "destructive";
  if (status === "active") return "default";
  if (status === "paid") return "default";
  return "secondary";
}

export function StaffStudentsPage() {
  const { t } = useTranslation(["common", "students"]);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [accountStatus, setAccountStatus] = useState("all");
  const [completion, setCompletion] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<StaffStudentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const regionOptions = useMemo(() => sortedRegionOptions(t), [t]);
  const accountStatusLabel = (status: string) => t(`students:admin.status.${status}`, { defaultValue: status });
  const paymentStatusLabel = (status: string) => t(`students:admin.payment.${status}`, { defaultValue: status });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params: StaffStudentsQuery = {
      q: query,
      region,
      status: accountStatus,
      completion,
      payment_status: paymentStatus,
      page,
      limit: pageSize,
    };

    try {
      const response = await fetchStaffStudents(params);
      setItems(response.items);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err) {
      setItems([]);
      setTotal(0);
      setTotalPages(1);
      setError(err instanceof Error ? err.message : t("students:admin.errors.load"));
    } finally {
      setLoading(false);
    }
  }, [accountStatus, completion, page, paymentStatus, query, region, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const clearFilters = () => {
    setQuery("");
    setRegion("all");
    setAccountStatus("all");
    setCompletion("all");
    setPaymentStatus("all");
    setPage(1);
  };

  if (loading && items.length === 0) {
    return <LoadingState label={t("students:admin.loading")} />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold">{t("students:admin.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("students:admin.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("students:admin.filters.title")}</CardTitle>
          <CardDescription>{t("students:admin.filters.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder={t("students:admin.filters.search")}
              className="pl-9"
            />
          </div>
          <Select value={region} onValueChange={(value) => { setRegion(value); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder={t("students:admin.filters.region")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("students:admin.filters.allRegions")}</SelectItem>
              {regionOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={accountStatus} onValueChange={(value) => { setAccountStatus(value); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder={t("students:admin.filters.accountStatus")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("students:admin.filters.allStatuses")}</SelectItem>
              <SelectItem value="active">{t("students:admin.status.active")}</SelectItem>
              <SelectItem value="blocked">{t("students:admin.status.blocked")}</SelectItem>
              <SelectItem value="suspended">{t("students:admin.status.suspended")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={completion} onValueChange={(value) => { setCompletion(value); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder={t("students:admin.filters.completion")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("students:admin.filters.allCompletion")}</SelectItem>
              <SelectItem value="complete">{t("students:admin.completion.complete")}</SelectItem>
              <SelectItem value="partial">{t("students:admin.completion.partial")}</SelectItem>
              <SelectItem value="low">{t("students:admin.completion.low")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={paymentStatus} onValueChange={(value) => { setPaymentStatus(value); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder={t("students:admin.filters.paymentStatus")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("students:admin.filters.allPayments")}</SelectItem>
              <SelectItem value="unpaid">{t("students:admin.payment.unpaid")}</SelectItem>
              <SelectItem value="paid">{t("students:admin.payment.paid")}</SelectItem>
              <SelectItem value="pending">{t("students:admin.payment.pending")}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2 xl:col-start-5" onClick={clearFilters}>
            <X className="h-4 w-4" />
            {t("students:admin.filters.clear")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t("students:admin.table.title")}</CardTitle>
            <CardDescription>{t("students:admin.table.count", { count: total })}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <EmptyState title={t("students:admin.empty.title")} description={t("students:admin.empty.description")} />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("students:admin.table.student")}</TableHead>
                      <TableHead>{t("students:admin.table.region")}</TableHead>
                      <TableHead>{t("students:admin.table.language")}</TableHead>
                      <TableHead>{t("students:admin.table.profile")}</TableHead>
                      <TableHead>{t("students:admin.table.applications")}</TableHead>
                      <TableHead>{t("students:admin.table.payment")}</TableHead>
                      <TableHead>{t("students:admin.table.status")}</TableHead>
                      <TableHead>{t("students:admin.table.registered")}</TableHead>
                      <TableHead>{t("students:admin.table.lastActivity")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((student) => (
                      <TableRow key={student.student_id}>
                        <TableCell>
                          <div className="font-medium">{student.full_name}</div>
                          <div className="text-sm text-muted-foreground">{student.email}</div>
                          <div className="font-mono text-xs text-muted-foreground">{student.student_id}</div>
                          {student.phone_number ? <div className="text-xs text-muted-foreground">{student.phone_number}</div> : null}
                        </TableCell>
                        <TableCell>{student.region_code ? translateRegionCode(t, student.region_code) : t("labels.unknown")}</TableCell>
                        <TableCell>{student.interface_language.toUpperCase()}</TableCell>
                        <TableCell>{student.profile_completion_percent}%</TableCell>
                        <TableCell>{student.applications_count} / {student.submitted_applications_count}</TableCell>
                        <TableCell><Badge variant={statusVariant(student.payment_status)}>{paymentStatusLabel(student.payment_status)}</Badge></TableCell>
                        <TableCell><Badge variant={statusVariant(student.account_status)}>{accountStatusLabel(student.account_status)}</Badge></TableCell>
                        <TableCell>{formatDate(student.registration_date, t("students:admin.table.never"))}</TableCell>
                        <TableCell>{formatDate(student.last_activity, t("students:admin.table.never"))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 md:hidden">
                {items.map((student) => (
                  <div key={student.student_id} className="rounded-lg border p-4">
                    <div className="font-medium">{student.full_name}</div>
                    <div className="text-sm text-muted-foreground">{student.email}</div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-muted-foreground">{t("students:admin.table.region")}: </span>{student.region_code ? translateRegionCode(t, student.region_code) : t("labels.unknown")}</div>
                      <div><span className="text-muted-foreground">{t("students:admin.table.profile")}: </span>{student.profile_completion_percent}%</div>
                      <div><span className="text-muted-foreground">{t("students:admin.table.applications")}: </span>{student.applications_count}</div>
                      <div><span className="text-muted-foreground">{t("students:admin.table.registered")}: </span>{formatDate(student.registration_date, t("students:admin.table.never"))}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  {t("students:admin.table.page", { page, totalPages })}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                    {t("students:admin.table.previous")}
                  </Button>
                  <Button variant="outline" disabled={page >= totalPages || loading} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
                    {t("students:admin.table.next")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
