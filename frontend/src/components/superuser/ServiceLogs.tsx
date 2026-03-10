// @ts-nocheck
import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Download,
  RefreshCw,
  Search,
  X,
  Copy,
  ChevronDown,
  Terminal,
  Clock,
  Server,
  User,
  Code,
  CheckCircle2,
  MoreVertical
} from 'lucide-react';

interface ServiceLogsProps {
  onNavigate?: (page: string) => void;
  logsData?: LogEntry[];
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  microservice: string;
  handler: string;
  message: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

export function ServiceLogs({ onNavigate, logsData }: ServiceLogsProps) {
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState('off');
  const [showIntervalMenu, setShowIntervalMenu] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Filter states
  const [levelFilters, setLevelFilters] = useState<string[]>(['info', 'warn', 'error', 'fatal']);
  const [timeRange, setTimeRange] = useState('1h');
  const [handlerSearch, setHandlerSearch] = useState('');
  const [serviceFilters, setServiceFilters] = useState<string[]>([]);
  const [userIdFilter, setUserIdFilter] = useState('');

  // Mock log data
  const logEntries: LogEntry[] = logsData ?? [
    {
      id: '1',
      timestamp: '2024-01-20 14:32:15.234',
      level: 'info',
      microservice: 'client-service',
      handler: '/api/v1/applications/submit',
      message: 'Application submission successful for university ID: uni_stanford_2024',
      userId: 'user_12345',
      requestId: 'req_abc123def456',
      metadata: {
        universityId: 'uni_stanford_2024',
        applicationId: 'app_789xyz',
        status: 'submitted',
        duration_ms: 234
      }
    },
    {
      id: '2',
      timestamp: '2024-01-20 14:31:58.123',
      level: 'warn',
      microservice: 'admin-service',
      handler: '/api/v1/superuser/drafts/approve',
      message: 'Draft approval attempt without sufficient permissions. User missing SUPERUSER_APPROVE role.',
      userId: 'user_67890',
      requestId: 'req_def789ghi012',
      metadata: {
        draftId: 'draft_456abc',
        requiredRole: 'SUPERUSER_APPROVE',
        userRoles: ['UNIVERSITY_ADMIN']
      }
    },
    {
      id: '3',
      timestamp: '2024-01-20 14:31:42.987',
      level: 'error',
      microservice: 'notification-service',
      handler: '/internal/send-email',
      message: 'SMTP connection timeout: Failed to send application status email to applicant',
      userId: 'user_12345',
      requestId: 'req_ghi345jkl678',
      metadata: {
        emailTo: 'applicant@example.com',
        templateId: 'application_status_update',
        error: 'ETIMEDOUT',
        retryAttempt: 3
      }
    },
    {
      id: '4',
      timestamp: '2024-01-20 14:31:15.456',
      level: 'debug',
      microservice: 'client-service',
      handler: '/api/v1/universities/search',
      message: 'University search query executed: filter={"country":"US","ranking":{"$lte":50}} limit=20',
      userId: 'user_54321',
      requestId: 'req_jkl901mno234',
      metadata: {
        queryTime_ms: 45,
        resultsCount: 18,
        cacheHit: false
      }
    },
    {
      id: '5',
      timestamp: '2024-01-20 14:30:58.789',
      level: 'fatal',
      microservice: 'database-proxy',
      handler: '/internal/health-check',
      message: 'Database connection pool exhausted. No available connections after 30s timeout.',
      requestId: 'req_pqr567stu890',
      metadata: {
        poolSize: 50,
        activeConnections: 50,
        waitingRequests: 127,
        errorCode: 'POOL_EXHAUSTED'
      }
    },
    {
      id: '6',
      timestamp: '2024-01-20 14:30:45.321',
      level: 'info',
      microservice: 'admin-service',
      handler: '/api/v1/superuser/audit-logs',
      message: 'Audit log query completed successfully',
      userId: 'superuser_001',
      requestId: 'req_vwx123yza456',
      metadata: {
        filters: { action: 'DRAFT_APPROVED', dateRange: '7d' },
        resultsCount: 42,
        queryTime_ms: 89
      }
    },
    {
      id: '7',
      timestamp: '2024-01-20 14:30:12.654',
      level: 'warn',
      microservice: 'client-service',
      handler: '/api/v1/applications/submit',
      message: 'Rate limit warning: User approaching submission rate limit (4/5 applications in 1h)',
      userId: 'user_99999',
      requestId: 'req_bcd789efg012',
      metadata: {
        currentCount: 4,
        limit: 5,
        windowSeconds: 3600,
        resetAt: '2024-01-20 15:30:12'
      }
    }
  ];

  const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
  const microservices = ['client-service', 'admin-service', 'notification-service', 'database-proxy', 'auth-service'];
  const timeRangeOptions = [
    { label: 'Last 15 minutes', value: '15m' },
    { label: 'Last 1 hour', value: '1h' },
    { label: 'Last 24 hours', value: '24h' },
    { label: 'Last 7 days', value: '7d' },
    { label: 'Custom', value: 'custom' }
  ];

  const intervalOptions = [
    { label: 'Off', value: 'off' },
    { label: 'Every 10s', value: '10s' },
    { label: 'Every 30s', value: '30s' },
    { label: 'Every 60s', value: '60s' }
  ];

  const getLevelColor = (level: string) => {
    const colors = {
      trace: 'bg-gray-100 text-gray-700 border-gray-300',
      debug: 'bg-blue-50 text-blue-700 border-blue-200',
      info: 'bg-green-50 text-green-700 border-green-200',
      warn: 'bg-orange-50 text-orange-700 border-orange-200',
      error: 'bg-red-50 text-red-700 border-red-200',
      fatal: 'bg-purple-50 text-purple-700 border-purple-200'
    };
    return colors[level as keyof typeof colors] || colors.info;
  };

  const toggleLevelFilter = (level: string) => {
    setLevelFilters(prev =>
      prev.includes(level)
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  };

  const toggleServiceFilter = (service: string) => {
    setServiceFilters(prev =>
      prev.includes(service)
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  };

  const handleRefresh = () => {
    console.log('Refreshing logs...');
  };

  const handleExport = () => {
    console.log('Exporting logs...');
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const filteredLogs = logEntries.filter(log => {
    if (!levelFilters.includes(log.level)) return false;
    if (serviceFilters.length > 0 && !serviceFilters.includes(log.microservice)) return false;
    if (handlerSearch && !log.handler.toLowerCase().includes(handlerSearch.toLowerCase())) return false;
    if (userIdFilter && log.userId !== userIdFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background w-full">
      {/* Header - Responsive */}
      <div className="border-b bg-card sticky top-0 z-10 w-full">
        <div className="max-w-full px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
            <div className="flex-shrink min-w-0">
              <h1 className="text-2xl sm:text-3xl font-semibold mb-1">Service Logs</h1>
              <p className="text-sm text-muted-foreground">Filter and inspect platform logs across microservices</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Auto-refresh toggle */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowIntervalMenu(!showIntervalMenu)}
                  className="gap-2 text-xs whitespace-nowrap"
                >
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">Auto-refresh:</span>
                  <span>{intervalOptions.find(o => o.value === refreshInterval)?.label}</span>
                  <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                </Button>
                {showIntervalMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-card border rounded-lg shadow-lg z-20">
                    {intervalOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setRefreshInterval(option.value);
                          setAutoRefresh(option.value !== 'off');
                          setShowIntervalMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-accent text-sm first:rounded-t-lg last:rounded-b-lg"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              <Button size="sm" onClick={handleRefresh} className="gap-2">
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>

          {/* Filters Bar - Fully Responsive with Wrapping */}
          <Card className="bg-accent/30 w-full">
            <CardContent className="p-3 sm:p-4">
              <div className="space-y-4">
                {/* Row 1: Level Filters */}
                <div className="w-full">
                  <label className="text-sm font-medium mb-2 block">Level</label>
                  <div className="flex flex-wrap gap-2">
                    {levels.map(level => (
                      <Badge
                        key={level}
                        variant="outline"
                        className={`cursor-pointer transition-all text-xs ${
                          levelFilters.includes(level)
                            ? getLevelColor(level) + ' ring-2 ring-offset-1'
                            : 'bg-background text-muted-foreground'
                        }`}
                        onClick={() => toggleLevelFilter(level)}
                      >
                        {level.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Row 2: Time Range - Wrapping buttons */}
                <div className="w-full">
                  <label className="text-sm font-medium mb-2 block">Time Range</label>
                  <div className="flex flex-wrap gap-2">
                    {timeRangeOptions.map(option => (
                      <Button
                        key={option.value}
                        variant={timeRange === option.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTimeRange(option.value)}
                        className="text-xs whitespace-nowrap"
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Row 3: Handler, Microservice, User ID - Responsive Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
                  {/* Handler Search */}
                  <div className="min-w-0">
                    <label className="text-sm font-medium mb-2 block">Handler / Route</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <input
                        type="text"
                        placeholder="Search handlers..."
                        value={handlerSearch}
                        onChange={(e) => setHandlerSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border rounded-lg bg-background text-sm"
                      />
                    </div>
                  </div>

                  {/* Microservice Filter */}
                  <div className="min-w-0">
                    <label className="text-sm font-medium mb-2 block">Microservice</label>
                    <div className="flex flex-wrap gap-2">
                      {microservices.slice(0, 3).map(service => (
                        <Badge
                          key={service}
                          variant="outline"
                          className={`cursor-pointer transition-all text-xs whitespace-nowrap ${
                            serviceFilters.includes(service)
                              ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                              : 'bg-background'
                          }`}
                          onClick={() => toggleServiceFilter(service)}
                        >
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* User ID Filter */}
                  <div className="min-w-0">
                    <label className="text-sm font-medium mb-2 block">User ID</label>
                    <input
                      type="text"
                      placeholder="Exact match..."
                      value={userIdFilter}
                      onChange={(e) => setUserIdFilter(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                    />
                  </div>
                </div>

                {/* Active filters summary */}
                {(levelFilters.length < 6 || serviceFilters.length > 0 || handlerSearch || userIdFilter) && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t w-full">
                    <span className="text-xs text-muted-foreground flex-shrink-0">Active filters:</span>
                    {levelFilters.length < 6 && (
                      <Badge variant="secondary" className="text-xs">
                        {levelFilters.length} levels
                      </Badge>
                    )}
                    {serviceFilters.map(service => (
                      <Badge key={service} variant="secondary" className="text-xs gap-1 whitespace-nowrap">
                        {service}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => toggleServiceFilter(service)} />
                      </Badge>
                    ))}
                    {handlerSearch && (
                      <Badge variant="secondary" className="text-xs gap-1 whitespace-nowrap">
                        Handler: {handlerSearch}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => setHandlerSearch('')} />
                      </Badge>
                    )}
                    {userIdFilter && (
                      <Badge variant="secondary" className="text-xs gap-1 whitespace-nowrap">
                        User: {userIdFilter}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => setUserIdFilter('')} />
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setLevelFilters(['info', 'warn', 'error', 'fatal']);
                        setServiceFilters([]);
                        setHandlerSearch('');
                        setUserIdFilter('');
                      }}
                      className="ml-auto text-xs"
                    >
                      Clear all
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Logs Table - Responsive with Horizontal Scroll Container */}
      <div className="w-full px-4 py-4 sm:px-6 sm:py-6">
        <Card className="w-full">
          <div className="space-y-3 p-4 md:hidden">
            {filteredLogs.length === 0 ? (
              <div className="rounded-lg border p-8 text-center">
                <Terminal className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-50" />
                <div className="font-medium">No logs match your filters</div>
                <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters or time range.</p>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="cursor-pointer rounded-lg border p-4 space-y-3 transition-colors hover:bg-accent/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-xs text-muted-foreground">{log.timestamp}</div>
                      <div className="mt-1 text-sm font-medium">{log.message}</div>
                    </div>
                    <Badge variant="outline" className={`text-xs whitespace-nowrap ${getLevelColor(log.level)}`}>
                      {log.level.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="grid gap-2 text-xs sm:grid-cols-2">
                    <div>
                      <div className="text-muted-foreground">Service</div>
                      <div className="font-medium">{log.microservice}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">User ID</div>
                      <div className="font-mono">{log.userId || '—'}</div>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="text-muted-foreground">Handler</div>
                      <div className="font-mono break-all">{log.handler}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[800px]">
              <thead className="border-b bg-accent/50">
                <tr>
                  <th className="text-left p-3 text-xs sm:text-sm font-medium whitespace-nowrap">Timestamp</th>
                  <th className="text-left p-3 text-xs sm:text-sm font-medium whitespace-nowrap">Level</th>
                  <th className="text-left p-3 text-xs sm:text-sm font-medium whitespace-nowrap hidden lg:table-cell">Microservice</th>
                  <th className="text-left p-3 text-xs sm:text-sm font-medium whitespace-nowrap hidden xl:table-cell">Handler</th>
                  <th className="text-left p-3 text-xs sm:text-sm font-medium">Message</th>
                  <th className="text-left p-3 text-xs sm:text-sm font-medium whitespace-nowrap hidden md:table-cell">User ID</th>
                  <th className="text-left p-3 text-xs sm:text-sm font-medium whitespace-nowrap hidden 2xl:table-cell">Request ID</th>
                  <th className="text-left p-3 text-xs sm:text-sm font-medium w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Terminal className="w-12 h-12 text-muted-foreground opacity-50" />
                        <div>
                          <div className="font-medium text-base sm:text-lg mb-1">No logs match your filters</div>
                          <p className="text-sm text-muted-foreground">
                            Try adjusting your filters or time range
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="border-b hover:bg-accent/50 cursor-pointer transition-colors"
                    >
                      <td className="p-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={`text-xs whitespace-nowrap ${getLevelColor(log.level)}`}>
                          {log.level.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs sm:text-sm font-medium whitespace-nowrap hidden lg:table-cell">{log.microservice}</td>
                      <td className="p-3 text-xs font-mono text-muted-foreground hidden xl:table-cell">
                        <div className="max-w-[200px] truncate">{log.handler}</div>
                      </td>
                      <td className="p-3 text-xs sm:text-sm font-mono">
                        <div className="max-w-[300px] xl:max-w-[400px] truncate">{log.message}</div>
                      </td>
                      <td className="p-3 text-xs sm:text-sm font-mono text-muted-foreground whitespace-nowrap hidden md:table-cell">
                        {log.userId || '—'}
                      </td>
                      <td className="p-3 text-xs font-mono text-muted-foreground whitespace-nowrap hidden 2xl:table-cell">
                        {log.requestId || '—'}
                      </td>
                      <td className="p-3">
                        <button className="p-1 hover:bg-accent rounded">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 sm:p-4 border-t bg-accent/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs sm:text-sm text-muted-foreground">
            <span>Showing {filteredLogs.length} of {logEntries.length} logs</span>
            <span>Last updated: 2 seconds ago</span>
          </div>
        </Card>
      </div>

      {/* Log Detail Drawer - Responsive */}
      {selectedLog && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] lg:w-[600px] max-w-full bg-card border-l shadow-2xl z-50 overflow-y-auto">
          <div className="sticky top-0 bg-card border-b p-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3 min-w-0">
              <Terminal className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <h3 className="font-semibold truncate">Log Details</h3>
                <p className="text-xs text-muted-foreground font-mono truncate">{selectedLog.id}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelectedLog(null)} className="flex-shrink-0">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Overview */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Code className="w-4 h-4" />
                Overview
              </h4>
              <div className="space-y-3 bg-accent/30 p-4 rounded-lg">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-sm text-muted-foreground flex-shrink-0">Timestamp</span>
                  <span className="text-sm font-mono text-right break-all">{selectedLog.timestamp}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-sm text-muted-foreground flex-shrink-0">Level</span>
                  <Badge variant="outline" className={`text-xs ${getLevelColor(selectedLog.level)}`}>
                    {selectedLog.level.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-sm text-muted-foreground flex-shrink-0">Microservice</span>
                  <Badge variant="secondary" className="text-xs">{selectedLog.microservice}</Badge>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-sm text-muted-foreground flex-shrink-0">Handler</span>
                  <span className="text-sm font-mono text-right break-all">{selectedLog.handler}</span>
                </div>
              </div>
            </div>

            {/* Message */}
            <div>
              <div className="flex items-center justify-between mb-3 gap-2">
                <h4 className="text-sm font-semibold">Message</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(selectedLog.message, 'message')}
                  className="gap-2 flex-shrink-0"
                >
                  {copiedField === 'message' ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      <span className="hidden sm:inline">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span className="hidden sm:inline">Copy</span>
                    </>
                  )}
                </Button>
              </div>
              <div className="bg-black text-green-400 p-4 rounded-lg text-xs sm:text-sm font-mono whitespace-pre-wrap break-words overflow-x-auto">
                {selectedLog.message}
              </div>
            </div>

            {/* Context */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Context
              </h4>
              <div className="space-y-2">
                {selectedLog.userId && (
                  <div className="flex items-center justify-between p-3 bg-accent/30 rounded-lg gap-4">
                    <span className="text-sm text-muted-foreground flex-shrink-0">User ID</span>
                    <span className="text-sm font-mono break-all text-right">{selectedLog.userId}</span>
                  </div>
                )}
                {selectedLog.requestId && (
                  <div className="flex items-center justify-between p-3 bg-accent/30 rounded-lg gap-4">
                    <span className="text-sm text-muted-foreground flex-shrink-0">Request ID</span>
                    <span className="text-sm font-mono break-all text-right">{selectedLog.requestId}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata */}
            {selectedLog.metadata && (
              <div>
                <div className="flex items-center justify-between mb-3 gap-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    Metadata (JSON)
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(JSON.stringify(selectedLog.metadata, null, 2), 'metadata')}
                    className="gap-2 flex-shrink-0"
                  >
                    {copiedField === 'metadata' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span className="hidden sm:inline">Copy JSON</span>
                      </>
                    )}
                  </Button>
                </div>
                <div className="bg-black text-cyan-400 p-4 rounded-lg text-xs font-mono overflow-x-auto">
                  <pre className="break-words whitespace-pre-wrap">{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

