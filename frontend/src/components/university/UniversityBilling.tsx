// @ts-nocheck
import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  CreditCard, 
  Download, 
  Calendar, 
  FileText,
  AlertCircle,
  CheckCircle2,
  Package,
  Building2,
  X,
  Check,
  Zap
} from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import type { ManagementContext } from '../../types/managementLiteral';

interface UniversityBillingProps {
  onNavigate?: (page: string) => void;
  context?: ManagementContext;
}

export function UniversityBilling({ onNavigate, context }: UniversityBillingProps) {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [chargingMethod, setChargingMethod] = useState<'per-app' | 'package'>('per-app');

  // Get university name from context
  const universityName = context?.type === 'university' ? context.universityName : 'Stanford University';
  const isGlobalMode = context?.type === 'global';

  // Current usage data
  const currentUsage = {
    billingPeriodStart: '2024-01-01',
    billingPeriodEnd: '2024-01-31',
    applicationsSubmitted: 8,
    totalCostThisPeriod: 464, // 8 apps × $58/app
    activePackageBalance: 12, // 12 out of 20 remaining
    packageTotal: 20
  };

  // Pay per application pricing
  const perAppPrice = 58;

  // Application packages - MAX 20 APPLICATIONS
  const packages = [
    {
      id: 'package-5',
      applications: 5,
      price: 270,
      pricePerApp: 54,
      savings: 20,
      popular: false
    },
    {
      id: 'package-10',
      applications: 10,
      price: 500,
      pricePerApp: 50,
      savings: 80,
      popular: true
    },
    {
      id: 'package-20',
      applications: 20,
      price: 920,
      pricePerApp: 46,
      savings: 240,
      popular: false
    }
  ];

  // Invoice history
  const invoices = [
    {
      id: 'INV-2024-003',
      date: '2024-01-15',
      type: 'Package',
      description: '20 Applications Package',
      amount: 920,
      status: 'paid',
      downloadUrl: '#'
    },
    {
      id: 'INV-2024-002',
      date: '2024-01-08',
      type: 'Pay per application',
      description: '3 Application Submissions',
      amount: 174,
      status: 'paid',
      downloadUrl: '#'
    },
    {
      id: 'INV-2024-001',
      date: '2024-01-01',
      type: 'Package',
      description: '10 Applications Package',
      amount: 500,
      status: 'paid',
      downloadUrl: '#'
    }
  ];

  const handlePurchase = (packageId: string) => {
    setSelectedPackage(packageId);
    setShowPurchaseModal(true);
  };

  const handleConfirmPurchase = () => {
    setShowPurchaseModal(false);
    setShowSuccessModal(true);
  };

  const handleSetChargingMethod = (method: 'per-app' | 'package') => {
    setChargingMethod(method);
    // In real app, this would save the preference
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      paid: 'bg-green-50 text-green-700 border-green-200',
      pending: 'bg-orange-50 text-orange-700 border-orange-200',
      failed: 'bg-red-50 text-red-700 border-red-200'
    };
    return (
      <Badge variant="outline" className={styles[status as keyof typeof styles] || styles.paid}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const selectedPackageData = packages.find(p => p.id === selectedPackage);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* A) Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">University: {universityName}</span>
          </div>
          <h1 className="text-3xl font-semibold">Billing</h1>
          <p className="text-muted-foreground mt-1">
            You are charged per application submission or via prepaid packages.
          </p>
        </div>

        {/* B) Current Usage Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Current Usage Summary</CardTitle>
            <CardDescription>
              Billing period: {currentUsage.billingPeriodStart} to {currentUsage.billingPeriodEnd}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Applications Submitted</div>
                <div className="text-3xl font-semibold">{currentUsage.applicationsSubmitted}</div>
                <div className="text-xs text-muted-foreground">This billing period</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Total Cost This Period</div>
                <div className="text-3xl font-semibold">${currentUsage.totalCostThisPeriod}</div>
                <div className="text-xs text-muted-foreground">USD</div>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Active Package Balance</div>
                <div className="text-3xl font-semibold">
                  {currentUsage.activePackageBalance}/{currentUsage.packageTotal}
                </div>
                <div className="text-xs text-muted-foreground">Remaining applications</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* C) Pay per Application Card */}
        <Card className={chargingMethod === 'per-app' ? 'border-[#4F46E5] border-2' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Pay per application</CardTitle>
                <CardDescription className="mt-1">
                  Pay only when an application is submitted.
                </CardDescription>
              </div>
              {chargingMethod === 'per-app' && (
                <Badge className="bg-[#4F46E5] text-white">
                  <Check className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-6 bg-accent/50 rounded-lg text-center">
              <div className="text-4xl font-semibold mb-1">${perAppPrice}</div>
              <div className="text-sm text-muted-foreground">per application</div>
            </div>
            
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>No upfront cost</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Billed after each submission</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Flexible for variable volume</span>
              </li>
            </ul>

            {chargingMethod !== 'per-app' ? (
              <Button 
                onClick={() => handleSetChargingMethod('per-app')}
                variant="outline" 
                className="w-full"
              >
                Set as default charging method
              </Button>
            ) : (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                <div className="text-sm text-green-700 font-medium">
                  Current charging method
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* D) Application Packages Card */}
        <Card>
          <CardHeader>
            <CardTitle>Application Packages</CardTitle>
            <CardDescription>
              Save money with prepaid packages. Maximum 20 applications per package.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`relative p-6 border rounded-lg transition-all ${
                    pkg.popular ? 'border-[#4F46E5] border-2 shadow-md' : 'hover:border-[#4F46E5]/50'
                  }`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-[#4F46E5] text-white px-3 py-1">
                        <Zap className="w-3 h-3 mr-1" />
                        Best Value
                      </Badge>
                    </div>
                  )}

                  <div className="text-center space-y-4">
                    <div>
                      <div className="text-2xl font-semibold mb-1">
                        {pkg.applications} Applications
                      </div>
                      <div className="text-3xl font-bold text-[#4F46E5]">${pkg.price}</div>
                      <div className="text-xs text-muted-foreground mt-2">
                        ≈ ${pkg.pricePerApp} / application
                      </div>
                    </div>

                    {pkg.savings > 0 && (
                      <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700 font-medium">
                        Save ${pkg.savings}
                      </div>
                    )}

                    <Button
                      onClick={() => handlePurchase(pkg.id)}
                      className={pkg.popular ? 'w-full bg-[#4F46E5] hover:bg-[#4338CA]' : 'w-full'}
                      variant={pkg.popular ? 'default' : 'outline'}
                    >
                      Buy Package
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Maximum package size: 20 applications</p>
                <p className="text-blue-700">
                  Need more capacity? <button className="underline font-medium hover:text-blue-900">Contact support</button> for custom arrangements.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* E) Invoices / Payments Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Invoices & Payments</CardTitle>
                <CardDescription>View and download your billing history</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Description</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Amount</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b hover:bg-accent/50 transition-colors">
                      <td className="py-4 px-4 text-sm">{invoice.date}</td>
                      <td className="py-4 px-4 text-sm">
                        <Badge variant="outline">{invoice.type}</Badge>
                      </td>
                      <td className="py-4 px-4 text-sm">{invoice.description}</td>
                      <td className="py-4 px-4 text-sm text-right font-semibold">${invoice.amount}</td>
                      <td className="py-4 px-4 text-center">
                        {getStatusBadge(invoice.status)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
            <CardDescription>Manage your payment information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Visa Business ending in 8765</div>
                <div className="text-sm text-muted-foreground">Expires 06/2026</div>
              </div>
              <Badge variant="secondary">Default</Badge>
            </div>
            <Button variant="outline" className="w-full">
              + Add Payment Method
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && selectedPackageData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Buy Application Package</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowPurchaseModal(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Package Selection */}
              <div>
                <label className="text-sm font-medium mb-3 block">Select Package</label>
                <div className="grid grid-cols-3 gap-3">
                  {packages.map((pkg) => (
                    <button
                      key={pkg.id}
                      onClick={() => setSelectedPackage(pkg.id)}
                      className={`p-4 border rounded-lg text-center transition-all ${
                        selectedPackage === pkg.id
                          ? 'border-[#4F46E5] border-2 bg-[#4F46E5]/5'
                          : 'hover:border-[#4F46E5]/50'
                      }`}
                    >
                      <div className="text-xl font-semibold">{pkg.applications}</div>
                      <div className="text-xs text-muted-foreground">apps</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Payment Summary */}
              <div className="p-4 bg-accent/50 rounded-lg space-y-3">
                <div className="text-sm font-medium mb-3">Payment Summary</div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Package ({selectedPackageData.applications} applications)</span>
                  <span className="font-medium">${selectedPackageData.price}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Effective price per application</span>
                  <span className="font-medium">${selectedPackageData.pricePerApp}</span>
                </div>

                {selectedPackageData.savings > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-600">You save</span>
                    <span className="font-medium text-green-600">${selectedPackageData.savings}</span>
                  </div>
                )}
                
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="text-2xl font-bold text-[#4F46E5]">${selectedPackageData.price}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-sm font-medium mb-3 block">Payment Method</label>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <input type="radio" id="card" name="payment" className="w-4 h-4" defaultChecked />
                  <CreditCard className="w-5 h-5 text-muted-foreground" />
                  <label htmlFor="card" className="flex-1 font-medium cursor-pointer">
                    Visa ending in 8765
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowPurchaseModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleConfirmPurchase} className="flex-1 bg-[#4F46E5] hover:bg-[#4338CA]">
                  Purchase ${selectedPackageData.price}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && selectedPackageData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Package purchased successfully</h3>
              <p className="text-muted-foreground mb-6">
                You now have {currentUsage.activePackageBalance + selectedPackageData.applications} applications remaining.
              </p>
              <Button onClick={() => setShowSuccessModal(false)} className="w-full">
                Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

