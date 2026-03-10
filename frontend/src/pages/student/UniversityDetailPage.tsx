import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  DollarSign,
  Globe,
  MapPin,
  Send,
} from "lucide-react";
import type { University } from "../../types/domain";
import { addCompareItem, fetchCompareList, removeCompareItem } from "../../services/client/compareService";
import { addBasketItem, fetchBasketState, removeBasketItem } from "../../services/client/basketService";
import { fetchUniversityById } from "../../services/client/universitiesService";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { EmptyState, ErrorState, LoadingState } from "../../components/common/PageState";
import { routes } from "../../routes/routeConfig";
import { formatRmb } from "../../utils/currency";

export function UniversityDetailPage() {
  const { id = "" } = useParams();
  const [university, setUniversity] = useState<University | null>(null);
  const [isInCompare, setIsInCompare] = useState(false);
  const [isInBasket, setIsInBasket] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [universityData, compareList, basketState] = await Promise.all([
          fetchUniversityById(id),
          fetchCompareList().catch(() => []),
          fetchBasketState().catch(() => null),
        ]);
        setUniversity(universityData);
        setIsInCompare(compareList.some((item) => item.id === id));
        setIsInBasket(basketState?.items.some((item) => item.id === id) ?? false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load university");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const toggleCompare = async () => {
    if (!university) return;
    try {
      if (isInCompare) {
        await removeCompareItem(university.id);
        setIsInCompare(false);
      } else {
        await addCompareItem(university.id);
        setIsInCompare(true);
      }
    } catch {
      // Keep the view stable if favorite update fails.
    }
  };

  const toggleBasket = async () => {
    if (!university) return;
    try {
      if (isInBasket) {
        await removeBasketItem(university.id);
        setIsInBasket(false);
      } else {
        await addBasketItem(university.id);
        setIsInBasket(true);
      }
    } catch {
      // Keep the view stable if basket update fails.
    }
  };

  if (loading) return <LoadingState label="Loading university..." />;
  if (error) return <ErrorState message={error} />;
  if (!university) {
    return (
      <EmptyState
        title="University missing"
        description="No university details were returned for this ID."
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link to={routes.student.universities}>
        <Button variant="ghost" size="sm" className="w-full justify-start sm:w-auto">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to results
        </Button>
      </Link>

      <section className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] text-xl font-semibold text-white">
            {university.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-2xl font-semibold sm:text-3xl">{university.name}</h1>
              <Badge variant="secondary" className="bg-[#4F46E5]/10 text-[#4F46E5]">
                {university.ranking ? `${Math.max(60, 300 - university.ranking)}% Match` : "N/A Match"}
              </Badge>
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground sm:gap-4">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {[university.city, university.country, university.province].filter(Boolean).join(", ") || "Location unavailable"}
              </span>
              <span className="flex items-center gap-1.5">
                <Award className="h-4 w-4" />
                Ranking #{university.ranking ?? "N/A"}
              </span>
              <span className="flex items-center gap-1.5">
                <Globe className="h-4 w-4" />
                University profile
              </span>
            </div>
            <p className="max-w-3xl text-muted-foreground">
              {university.description ?? "No description is available for this university yet."}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link to={routes.student.applicationCreate(university.id)}>
            <Button className="w-full bg-[#4F46E5] hover:bg-[#4338CA] sm:w-auto">
              <Send className="mr-2 h-4 w-4" />
              Apply Now
            </Button>
          </Link>
          <Button className="w-full sm:w-auto" variant={isInBasket ? "default" : "outline"} onClick={() => void toggleBasket()}>
            {isInBasket ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Added to Basket
              </>
            ) : (
              "Add to Basket"
            )}
          </Button>
          <Button className="w-full sm:w-auto" variant={isInCompare ? "default" : "outline"} onClick={() => void toggleCompare()}>
            {isInCompare ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Added to Compare
              </>
            ) : (
              "Add to Compare"
            )}
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <Award className="mb-2 h-5 w-5 text-muted-foreground" />
            <div className="text-2xl font-semibold">#{university.ranking ?? "N/A"}</div>
            <p className="text-xs text-muted-foreground">Global Ranking</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <DollarSign className="mb-2 h-5 w-5 text-muted-foreground" />
            <div className="text-2xl font-semibold">{formatRmb(university.tuitionFee ?? university.applicationFee, { fallback: "N/A" })}</div>
            <p className="text-xs text-muted-foreground">Tuition / Fee</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Globe className="mb-2 h-5 w-5 text-muted-foreground" />
            <div className="text-2xl font-semibold">{university.country ?? university.province ?? "N/A"}</div>
            <p className="text-xs text-muted-foreground">Country</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <CheckCircle2 className="mb-2 h-5 w-5 text-muted-foreground" />
            <div className="text-2xl font-semibold">{university.createdAt ? "Open" : "N/A"}</div>
            <p className="text-xs text-muted-foreground">Admissions</p>
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="admissions">Admissions</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                {university.description ??
                  "This university profile is connected to production APIs and rendered with fidelity layout styles."}
              </p>
              <p>Application schema fields are loaded dynamically during application flow.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="admissions">
          <Card>
            <CardHeader>
              <CardTitle>Admissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Admission requirements are managed by university application schema.</p>
              <p>Use Apply Now to begin draft creation for this university and cycle.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="costs">
          <Card>
            <CardHeader>
              <CardTitle>Costs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Application fee: {formatRmb(university.applicationFee, { fallback: "N/A" })}</p>
              <p>
                Tuition: {formatRmb(university.tuitionFee, { fallback: "N/A" })}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
