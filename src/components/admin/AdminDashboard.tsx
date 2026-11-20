import React, { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  Box,
  Check,
  Cpu,
  FileUp,
  FolderKanban,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { apiRequest } from '../../lib/api';
import {
  formatCurrency,
  USD_TO_INR,
  type AdminModuleKey,
  type LabourCatalogItem,
  type MaterialCatalogItem,
  type RegionMultiplierItem,
  type UserProfile,
} from '../../types/app';
import {
  Button,
  Card,
  DataTable,
  InputField,
  SelectField,
  UserAvatar,
} from '../ui/Primitives';

const ADMIN_MULTI_CHART_COLORS = [
  '#3049F5',
  '#10B981',
  '#F59E0B',
  '#EC4899',
  '#8B5CF6',
  '#06B6D4',
];

interface AdminOverviewData {
  totalUsers: number;
  activeUsers: number;
  totalProjects: number;
  blueprintUploads: number;
  completed3dModels: number;
  processingJobs: number;
  systemStatus: string;
  recentLogs: Array<{
    id: number;
    actorEmail: string;
    action: string;
    targetType: string;
    details: string | null;
    createdAt: string;
  }>;
  projectStatusDistribution: Array<{ status: string; count: number }>;
}

export function AdminDashboard({
  activeModule,
  onNavigateAdmin,
  onRefreshPricing,
}: {
  activeModule: AdminModuleKey;
  onNavigateAdmin: (mod: AdminModuleKey) => void;
  onRefreshPricing: () => Promise<void>;
}) {
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [materials, setMaterials] = useState<MaterialCatalogItem[]>([]);
  const [labour, setLabour] = useState<LabourCatalogItem[]>([]);
  const [regions, setRegions] = useState<RegionMultiplierItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [appSettings, setAppSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const [priceCurrency, setPriceCurrency] = useState<'INR' | 'USD'>('INR');

  // Add Material form (unitPriceInput is in the currently selected priceCurrency)
  const [newMat, setNewMat] = useState({
    name: '',
    category: 'Structural',
    unit: 'sqm',
    unitPriceInput: 8400,
    region: 'India (Tier-1 Metro)',
    source: 'CPWD / Regional Market Index 2026',
  });
  const [editingMatId, setEditingMatId] = useState<number | null>(null);
  const [editMatDraft, setEditMatDraft] = useState<{
    name: string;
    category: string;
    unit: string;
    unitPriceInput: number;
    region: string;
    source: string;
  } | null>(null);

  // Add Labour form
  const [newLab, setNewLab] = useState({
    trade: '',
    unit: 'sqm',
    rateInput: 4200,
    region: 'India (Tier-1 Metro)',
  });
  const [editingLabId, setEditingLabId] = useState<number | null>(null);
  const [editLabDraft, setEditLabDraft] = useState<{
    trade: string;
    unit: string;
    rateInput: number;
    region: string;
  } | null>(null);

  // Add Region form
  const [newReg, setNewReg] = useState({
    regionName: '',
    currency: 'USD',
    materialMultiplier: 1.0,
    labourMultiplier: 1.0,
    priceSource: 'Regional Cost Index 2026',
  });

  const toUsdFromDisplay = (val: number, cur: 'INR' | 'USD') =>
    cur === 'INR' ? Number((val / USD_TO_INR).toFixed(4)) : Number(val);

  const toDisplayFromUsd = (usd: number, cur: 'INR' | 'USD') =>
    cur === 'INR' ? Math.round(usd * USD_TO_INR) : Number(usd.toFixed(2));

  const switchPriceCurrency = (next: 'INR' | 'USD') => {
    if (next === priceCurrency) return;
    const convert = (val: number) =>
      next === 'INR' ? Math.round(val * USD_TO_INR) : Number((val / USD_TO_INR).toFixed(2));
    setNewMat((prev) => ({ ...prev, unitPriceInput: convert(prev.unitPriceInput) }));
    setNewLab((prev) => ({ ...prev, rateInput: convert(prev.rateInput) }));
    if (editMatDraft) {
      setEditMatDraft({ ...editMatDraft, unitPriceInput: convert(editMatDraft.unitPriceInput) });
    }
    if (editLabDraft) {
      setEditLabDraft({ ...editLabDraft, rateInput: convert(editLabDraft.rateInput) });
    }
    setPriceCurrency(next);
  };

  const loadAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, us, pr, cat, logs, sets] = await Promise.all([
        apiRequest<AdminOverviewData>('/api/admin/overview'),
        apiRequest<{ users: UserProfile[] }>('/api/admin/users'),
        apiRequest<{ projects: any[] }>('/api/admin/projects'),
        apiRequest<{
          materials: MaterialCatalogItem[];
          labour: LabourCatalogItem[];
          regions: RegionMultiplierItem[];
        }>('/api/pricing/catalog'),
        apiRequest<{ logs: any[] }>('/api/admin/audit-logs'),
        apiRequest<{ settings: Record<string, any> }>('/api/admin/settings'),
      ]);
      setOverview(ov);
      setUsersList(us.users);
      setProjectsList(pr.projects);
      setMaterials(cat.materials);
      setLabour(cat.labour);
      setRegions(cat.regions);
      setAuditLogs(logs.logs);
      setAppSettings(sets.settings || {});
    } catch (err: any) {
      setError(err.message || 'Unable to load administrator console.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  if (error) {
    return (
      <Card>
        <p className="text-sm text-[#D94A50] font-medium">{error}</p>
      </Card>
    );
  }

  if (loading && !overview) {
    return (
      <Card>
        <p className="text-sm text-[#777B87]">Loading administrator console...</p>
      </Card>
    );
  }

  const handleUpdateUser = async (
    id: number,
    updates: Partial<{ role: string; status: string; emailVerified: boolean }>
  ) => {
    setActionError(null);
    setActionNotice(null);
    try {
      await apiRequest(`/api/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      await loadAdminData();
      setActionNotice('User account updated.');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to update user account.');
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMat.name.trim()) return;
    setActionError(null);
    setActionNotice(null);
    try {
      const unitPriceUsd = toUsdFromDisplay(newMat.unitPriceInput, priceCurrency);
      await apiRequest('/api/admin/materials', {
        method: 'POST',
        body: JSON.stringify({
          name: newMat.name.trim(),
          category: newMat.category,
          unit: newMat.unit.trim() || 'sqm',
          unitPrice: unitPriceUsd,
          region: newMat.region,
          source: newMat.source.trim() || 'BUILDVISION Material Index',
        }),
      });
      setNewMat({ ...newMat, name: '' });
      await Promise.all([loadAdminData(), onRefreshPricing()]);
      setActionNotice(
        `Saved construction material in ${priceCurrency} and recalculated active projects.`
      );
    } catch (err: any) {
      setActionError(err?.message || 'Failed to save construction material.');
    }
  };

  const handleSaveEditMaterial = async () => {
    if (!editingMatId || !editMatDraft || !editMatDraft.name.trim()) return;
    setActionError(null);
    setActionNotice(null);
    const savedPriceInput = editMatDraft.unitPriceInput;
    try {
      const unitPriceUsd = toUsdFromDisplay(savedPriceInput, priceCurrency);
      await apiRequest('/api/admin/materials', {
        method: 'POST',
        body: JSON.stringify({
          id: editingMatId,
          name: editMatDraft.name.trim(),
          category: editMatDraft.category,
          unit: editMatDraft.unit.trim() || 'sqm',
          unitPrice: unitPriceUsd,
          region: editMatDraft.region,
          source: editMatDraft.source.trim() || 'BUILDVISION Material Index',
        }),
      });
      setEditingMatId(null);
      setEditMatDraft(null);
      await Promise.all([loadAdminData(), onRefreshPricing()]);
      setActionNotice(
        `Updated material price (${formatCurrency(
          savedPriceInput,
          priceCurrency
        )}) and synced all project estimates.`
      );
    } catch (err: any) {
      setActionError(err?.message || 'Failed to update material price.');
    }
  };

  const handleDeleteMaterial = async (id: number) => {
    setActionError(null);
    setActionNotice(null);
    try {
      await apiRequest(`/api/admin/materials/${id}`, { method: 'DELETE' });
      if (editingMatId === id) {
        setEditingMatId(null);
        setEditMatDraft(null);
      }
      await Promise.all([loadAdminData(), onRefreshPricing()]);
      setActionNotice('Construction material removed.');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to delete construction material.');
    }
  };

  const handleAddLabour = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLab.trade.trim()) return;
    setActionError(null);
    setActionNotice(null);
    try {
      const rateUsd = toUsdFromDisplay(newLab.rateInput, priceCurrency);
      await apiRequest('/api/admin/labour', {
        method: 'POST',
        body: JSON.stringify({
          trade: newLab.trade.trim(),
          unit: newLab.unit.trim() || 'sqm',
          ratePerUnit: rateUsd,
          region: newLab.region,
        }),
      });
      setNewLab({ ...newLab, trade: '' });
      await Promise.all([loadAdminData(), onRefreshPricing()]);
      setActionNotice('Labour trade rate saved and synced to project estimates.');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to save labour rate.');
    }
  };

  const handleSaveEditLabour = async () => {
    if (!editingLabId || !editLabDraft || !editLabDraft.trade.trim()) return;
    setActionError(null);
    setActionNotice(null);
    try {
      const rateUsd = toUsdFromDisplay(editLabDraft.rateInput, priceCurrency);
      await apiRequest('/api/admin/labour', {
        method: 'POST',
        body: JSON.stringify({
          id: editingLabId,
          trade: editLabDraft.trade.trim(),
          unit: editLabDraft.unit.trim() || 'sqm',
          ratePerUnit: rateUsd,
          region: editLabDraft.region,
        }),
      });
      setEditingLabId(null);
      setEditLabDraft(null);
      await Promise.all([loadAdminData(), onRefreshPricing()]);
      setActionNotice('Labour rate updated and synced to all projects.');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to update labour rate.');
    }
  };

  const handleDeleteLabour = async (id: number) => {
    setActionError(null);
    setActionNotice(null);
    try {
      await apiRequest(`/api/admin/labour/${id}`, { method: 'DELETE' });
      if (editingLabId === id) {
        setEditingLabId(null);
        setEditLabDraft(null);
      }
      await Promise.all([loadAdminData(), onRefreshPricing()]);
      setActionNotice('Labour rate removed.');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to delete labour rate.');
    }
  };

  const handleAddRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReg.regionName.trim()) return;
    setActionError(null);
    setActionNotice(null);
    try {
      await apiRequest('/api/admin/regions', {
        method: 'POST',
        body: JSON.stringify(newReg),
      });
      setNewReg({ ...newReg, regionName: '' });
      await Promise.all([loadAdminData(), onRefreshPricing()]);
      setActionNotice('Regional pricing multiplier saved.');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to save regional multiplier.');
    }
  };

  const handleSaveAppSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionNotice(null);
    try {
      await apiRequest('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings: appSettings }),
      });
      await loadAdminData();
      setActionNotice('Global application settings saved.');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to save global settings.');
    }
  };

  return (
    <div className="space-y-5">
      {actionError && (
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#D94A50]">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-[11px] font-medium underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
      {actionNotice && (
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-xs text-[#047857]">
          <span>{actionNotice}</span>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-[11px] font-medium underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
      {/* ADMIN OVERVIEW */}
      {activeModule === 'admin_overview' && overview && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="font-display text-xl font-semibold text-[#171923]">
                Administrator Overview
              </h1>
              <p className="text-xs text-[#777B87] mt-0.5">
                Platform-wide user governance, blueprint pipeline status, and regional cost indices.
              </p>
            </div>
            <span className="text-xs font-medium text-[#249B67] inline-flex items-center gap-1.5">
              <ShieldCheck size={15} /> System Status: {overview.systemStatus}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total Users', val: overview.totalUsers, icon: <Users size={16} /> },
              { label: 'Active Users', val: overview.activeUsers, icon: <UserCheck size={16} /> },
              { label: 'Total Projects', val: overview.totalProjects, icon: <FolderKanban size={16} /> },
              { label: 'Blueprint Uploads', val: overview.blueprintUploads, icon: <FileUp size={16} /> },
              { label: 'Completed 3D Models', val: overview.completed3dModels, icon: <Box size={16} /> },
              { label: 'Processing Jobs', val: overview.processingJobs, icon: <Cpu size={16} /> },
            ].map((c) => (
              <Card key={c.label} padding="p-4">
                <div className="flex items-center justify-between text-[#3049F5]">
                  <span className="text-[11px] text-[#777B87] font-medium">{c.label}</span>
                  {c.icon}
                </div>
                <p className="font-mono-num text-2xl font-semibold text-[#171923] mt-2">
                  {c.val}
                </p>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <Card className="lg:col-span-6">
              <h2 className="text-sm font-semibold text-[#171923] mb-3">
                Projects by Workflow Stage
              </h2>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview.projectStatusDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E6EB" vertical={false} />
                    <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#777B87' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#777B87' }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Projects" radius={[4, 4, 0, 0]}>
                      {overview.projectStatusDistribution.map((entry, idx) => (
                        <Cell
                          key={entry.status}
                          fill={ADMIN_MULTI_CHART_COLORS[idx % ADMIN_MULTI_CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="lg:col-span-6" padding="p-0">
              <div className="px-5 py-3.5 border-b border-[#E5E6EB] flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#171923]">Recent Audit Events</h2>
                <button
                  type="button"
                  onClick={() => onNavigateAdmin('admin_audit_logs')}
                  className="text-xs text-[#3049F5] hover:underline cursor-pointer"
                >
                  View All Logs
                </button>
              </div>
              <div className="divide-y divide-[#E5E6EB] max-h-[250px] overflow-y-auto">
                {overview.recentLogs.map((log) => (
                  <div key={log.id} className="px-5 py-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[#171923]">{log.action}</span>
                      <span className="font-mono-num text-[11px] text-[#777B87]">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#777B87] mt-0.5">
                      {log.actorEmail} · {log.details || log.targetType}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* USER MANAGEMENT & REGISTERED ACCOUNTS */}
      {(activeModule === 'admin_users' || activeModule === 'admin_registered_accounts') && (
        <div className="space-y-4">
          <div>
            <h1 className="font-display text-xl font-semibold text-[#171923]">
              {activeModule === 'admin_users' ? 'User Management' : 'Registered Accounts'}
            </h1>
            <p className="text-xs text-[#777B87] mt-0.5">
              Manage RBAC roles, account status, and email verification state.
            </p>
          </div>
          <Card padding="p-0">
            <DataTable
              rows={usersList}
              columns={[
                {
                  key: 'name',
                  header: 'User',
                  render: (u) => (
                    <div className="flex items-center gap-2.5">
                      <UserAvatar name={u.fullName} email={u.email} size="sm" />
                      <div>
                        <p className="font-medium text-xs text-[#171923]">{u.fullName}</p>
                        <p className="text-[11px] text-[#777B87]">{u.email}</p>
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'role',
                  header: 'Role',
                  render: (u) => (
                    <select
                      value={u.role}
                      onChange={(e) => handleUpdateUser(u.id, { role: e.target.value })}
                      className="h-8 px-2 text-xs border border-[#E5E6EB] rounded bg-white"
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (u) => (
                    <select
                      value={u.status}
                      onChange={(e) => handleUpdateUser(u.id, { status: e.target.value })}
                      className="h-8 px-2 text-xs border border-[#E5E6EB] rounded bg-white"
                    >
                      <option value="active">active</option>
                      <option value="suspended">suspended</option>
                    </select>
                  ),
                },
                {
                  key: 'verified',
                  header: 'Verified',
                  render: (u) => (
                    <span className={`text-xs ${u.emailVerified ? 'text-[#249B67]' : 'text-[#E8A13A]'}`}>
                      {u.emailVerified ? 'Verified' : 'Pending'}
                    </span>
                  ),
                },
                {
                  key: 'created',
                  header: 'Joined',
                  render: (u) => (
                    <span className="font-mono-num text-xs text-[#777B87]">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                    </span>
                  ),
                },
              ]}
            />
          </Card>
        </div>
      )}

      {/* PROJECT MONITORING & BLUEPRINT PROCESSING */}
      {(activeModule === 'admin_project_monitoring' ||
        activeModule === 'admin_blueprint_processing') && (
        <div className="space-y-4">
          <div>
            <h1 className="font-display text-xl font-semibold text-[#171923]">
              {activeModule === 'admin_project_monitoring'
                ? 'Project Monitoring'
                : 'Blueprint Processing Queue'}
            </h1>
            <p className="text-xs text-[#777B87] mt-0.5">
              Inspect user house planning projects and Gemini Vision blueprint extraction states.
            </p>
          </div>
          <Card padding="p-0">
            <DataTable
              rows={projectsList}
              emptyMessage="No projects created yet."
              columns={[
                { key: 'name', header: 'Project', render: (p) => <span className="font-medium text-xs">{p.name}</span> },
                { key: 'owner', header: 'Owner', render: (p) => <span className="text-xs text-[#777B87]">{p.ownerEmail}</span> },
                { key: 'file', header: 'Blueprint File', render: (p) => <span className="text-xs">{p.blueprintFileName || 'None'}</span> },
                { key: 'bpStatus', header: 'Processing Status', render: (p) => <span className="text-xs capitalize">{p.blueprintStatus}</span> },
                { key: 'area', header: 'Area (m²)', align: 'right', render: (p) => <span className="font-mono-num text-xs">{Number(p.totalAreaSqm || 0).toFixed(1)}</span> },
                { key: 'cost', header: 'Est. Cost', align: 'right', render: (p) => <span className="font-mono-num text-xs">{formatCurrency(p.estimatedCost, p.currency)}</span> },
              ]}
            />
          </Card>
        </div>
      )}

      {/* CONSTRUCTION MATERIALS */}
      {(activeModule === 'admin_materials' || activeModule === 'admin_cost_estimation') && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-xl font-semibold text-[#171923]">
                {activeModule === 'admin_materials'
                  ? 'Construction Materials Price Database'
                  : 'Cost Estimation Management'}
              </h1>
              <p className="text-xs text-[#777B87] mt-0.5">
                Edit or add material prices in Indian Rupee (INR ₹) or USD ($). Specific price &amp; region updates recalculate live project totals immediately.
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-[#F1F0EC] rounded-lg border border-[#E5E6EB] shrink-0">
              {(['INR', 'USD'] as const).map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => switchPriceCurrency(cur)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors ${
                    priceCurrency === cur
                      ? 'bg-white text-[#3049F5] border border-[#E5E6EB]'
                      : 'text-[#777B87] hover:text-[#171923]'
                  }`}
                >
                  {cur === 'INR' ? 'INR (₹ Indian Money)' : 'USD ($)'}
                </button>
              ))}
            </div>
          </div>

          <Card>
            <form onSubmit={handleAddMaterial} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
              <div className="sm:col-span-3">
                <InputField
                  label="Material Name"
                  required
                  value={newMat.name}
                  onChange={(e) => setNewMat({ ...newMat, name: e.target.value })}
                  placeholder="e.g. TMT Steel & Brick Masonry"
                />
              </div>
              <div className="sm:col-span-2">
                <SelectField
                  label="Category"
                  value={newMat.category}
                  onChange={(e) => setNewMat({ ...newMat, category: e.target.value })}
                >
                  {['Structural', 'Flooring', 'Wall Finish', 'Ceiling', 'Roofing', 'Electrical', 'Plumbing'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </SelectField>
              </div>
              <div className="sm:col-span-3">
                <SelectField
                  label="Target Region"
                  value={newMat.region}
                  onChange={(e) => setNewMat({ ...newMat, region: e.target.value })}
                >
                  <option value="Global Standard">Global Standard (All Regions)</option>
                  {regions
                    .filter((r) => r.regionName !== 'Global Standard')
                    .map((r) => (
                      <option key={r.regionName} value={r.regionName}>
                        {r.regionName} ({r.currency})
                      </option>
                    ))}
                </SelectField>
              </div>
              <div className="sm:col-span-1">
                <InputField
                  label="Unit"
                  value={newMat.unit}
                  onChange={(e) => setNewMat({ ...newMat, unit: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <InputField
                  label={`Unit Price (${priceCurrency === 'INR' ? '₹ INR' : '$ USD'})`}
                  type="number"
                  min={0}
                  step={priceCurrency === 'INR' ? '10' : '0.5'}
                  value={newMat.unitPriceInput}
                  onChange={(e) =>
                    setNewMat({ ...newMat, unitPriceInput: Math.max(0, Number(e.target.value) || 0) })
                  }
                />
              </div>
              <div className="sm:col-span-1">
                <Button type="submit" className="w-full">
                  <Plus size={14} /> Add
                </Button>
              </div>
            </form>
          </Card>

          <Card padding="p-0">
            <DataTable
              rows={materials}
              columns={[
                {
                  key: 'name',
                  header: 'Material',
                  render: (m) =>
                    editingMatId === m.id && editMatDraft ? (
                      <input
                        type="text"
                        value={editMatDraft.name}
                        onChange={(e) =>
                          setEditMatDraft({ ...editMatDraft, name: e.target.value })
                        }
                        className="h-8 w-full min-w-[160px] px-2 text-xs border border-[#3049F5] rounded bg-white"
                      />
                    ) : (
                      <span className="font-medium text-xs text-[#171923]">{m.name}</span>
                    ),
                },
                {
                  key: 'cat',
                  header: 'Category',
                  render: (m) =>
                    editingMatId === m.id && editMatDraft ? (
                      <select
                        value={editMatDraft.category}
                        onChange={(e) =>
                          setEditMatDraft({ ...editMatDraft, category: e.target.value })
                        }
                        className="h-8 px-2 text-xs border border-[#3049F5] rounded bg-white"
                      >
                        {['Structural', 'Flooring', 'Wall Finish', 'Ceiling', 'Roofing', 'Electrical', 'Plumbing'].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-[#777B87]">{m.category}</span>
                    ),
                },
                {
                  key: 'region',
                  header: 'Region',
                  render: (m) =>
                    editingMatId === m.id && editMatDraft ? (
                      <select
                        value={editMatDraft.region}
                        onChange={(e) =>
                          setEditMatDraft({ ...editMatDraft, region: e.target.value })
                        }
                        className="h-8 px-2 text-xs border border-[#3049F5] rounded bg-white"
                      >
                        <option value="Global Standard">Global Standard</option>
                        {regions
                          .filter((r) => r.regionName !== 'Global Standard')
                          .map((r) => (
                            <option key={r.regionName} value={r.regionName}>
                              {r.regionName}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <span className="text-xs text-[#4E5360]">{m.region}</span>
                    ),
                },
                {
                  key: 'unit',
                  header: 'Unit',
                  render: (m) =>
                    editingMatId === m.id && editMatDraft ? (
                      <input
                        type="text"
                        value={editMatDraft.unit}
                        onChange={(e) =>
                          setEditMatDraft({ ...editMatDraft, unit: e.target.value })
                        }
                        className="h-8 w-16 px-2 text-xs font-mono-num border border-[#3049F5] rounded bg-white"
                      />
                    ) : (
                      <span className="font-mono-num text-xs">{m.unit}</span>
                    ),
                },
                {
                  key: 'price',
                  header: `Unit Price (${priceCurrency})`,
                  align: 'right',
                  render: (m) => {
                    if (editingMatId === m.id && editMatDraft) {
                      return (
                        <input
                          type="number"
                          min={0}
                          step={priceCurrency === 'INR' ? '10' : '0.5'}
                          value={editMatDraft.unitPriceInput}
                          onChange={(e) =>
                            setEditMatDraft({
                              ...editMatDraft,
                              unitPriceInput: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="h-8 w-28 px-2 text-xs text-right font-mono-num border border-[#3049F5] rounded bg-white"
                        />
                      );
                    }
                    const primaryAmount =
                      priceCurrency === 'INR' ? m.unitPrice * USD_TO_INR : m.unitPrice;
                    const secondaryText =
                      priceCurrency === 'INR'
                        ? formatCurrency(m.unitPrice, 'USD', 2)
                        : formatCurrency(m.unitPrice * USD_TO_INR, 'INR');
                    return (
                      <div className="text-right font-mono-num">
                        <span className="text-xs font-semibold text-[#171923] block">
                          {formatCurrency(primaryAmount, priceCurrency, priceCurrency === 'INR' ? 0 : 2)}
                        </span>
                        <span className="text-[10px] text-[#777B87]">{secondaryText}</span>
                      </div>
                    );
                  },
                },
                {
                  key: 'source',
                  header: 'Source',
                  render: (m) => <span className="text-xs text-[#777B87]">{m.source}</span>,
                },
                {
                  key: 'actions',
                  header: '',
                  align: 'right',
                  render: (m) =>
                    editingMatId === m.id ? (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handleSaveEditMaterial}
                          title="Save price change"
                          className="p-1.5 text-[#249B67] hover:bg-[#ECFDF5] rounded cursor-pointer"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMatId(null);
                            setEditMatDraft(null);
                          }}
                          title="Cancel edit"
                          className="p-1.5 text-[#777B87] hover:bg-[#F1F0EC] rounded cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMatId(m.id);
                            setEditMatDraft({
                              name: m.name,
                              category: m.category,
                              unit: m.unit,
                              unitPriceInput: toDisplayFromUsd(m.unitPrice, priceCurrency),
                              region: m.region,
                              source: m.source,
                            });
                          }}
                          title="Edit material price"
                          className="p-1.5 text-[#3049F5] hover:bg-[#EEF1FF] rounded cursor-pointer"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMaterial(m.id)}
                          title="Delete material"
                          className="p-1.5 text-[#777B87] hover:text-[#D94A50] rounded cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ),
                },
              ]}
            />
          </Card>
        </div>
      )}

      {/* LABOUR PRICE MANAGEMENT */}
      {activeModule === 'admin_labour' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h1 className="font-display text-xl font-semibold text-[#171923]">
              Labour Price Management
            </h1>
            <div className="flex items-center gap-1 p-1 bg-[#F1F0EC] rounded-lg border border-[#E5E6EB] shrink-0">
              {(['INR', 'USD'] as const).map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => switchPriceCurrency(cur)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors ${
                    priceCurrency === cur
                      ? 'bg-white text-[#3049F5] border border-[#E5E6EB]'
                      : 'text-[#777B87] hover:text-[#171923]'
                  }`}
                >
                  {cur === 'INR' ? 'INR (₹ Indian Money)' : 'USD ($)'}
                </button>
              ))}
            </div>
          </div>
          <Card>
            <form onSubmit={handleAddLabour} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
              <div className="sm:col-span-4">
                <InputField
                  label="Trade / Craft"
                  required
                  value={newLab.trade}
                  onChange={(e) => setNewLab({ ...newLab, trade: e.target.value })}
                  placeholder="e.g. Masonry & RCC Works"
                />
              </div>
              <div className="sm:col-span-3">
                <SelectField
                  label="Target Region"
                  value={newLab.region}
                  onChange={(e) => setNewLab({ ...newLab, region: e.target.value })}
                >
                  <option value="Global Standard">Global Standard</option>
                  {regions
                    .filter((r) => r.regionName !== 'Global Standard')
                    .map((r) => (
                      <option key={r.regionName} value={r.regionName}>
                        {r.regionName} ({r.currency})
                      </option>
                    ))}
                </SelectField>
              </div>
              <div className="sm:col-span-1">
                <InputField
                  label="Unit"
                  value={newLab.unit}
                  onChange={(e) => setNewLab({ ...newLab, unit: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <InputField
                  label={`Rate (${priceCurrency === 'INR' ? '₹ INR' : '$ USD'})`}
                  type="number"
                  min={0}
                  step={priceCurrency === 'INR' ? '10' : '0.5'}
                  value={newLab.rateInput}
                  onChange={(e) =>
                    setNewLab({ ...newLab, rateInput: Math.max(0, Number(e.target.value) || 0) })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" className="w-full">
                  <Plus size={14} /> Add Trade
                </Button>
              </div>
            </form>
          </Card>
          <Card padding="p-0">
            <DataTable
              rows={labour}
              columns={[
                {
                  key: 'trade',
                  header: 'Trade',
                  render: (l) =>
                    editingLabId === l.id && editLabDraft ? (
                      <input
                        type="text"
                        value={editLabDraft.trade}
                        onChange={(e) =>
                          setEditLabDraft({ ...editLabDraft, trade: e.target.value })
                        }
                        className="h-8 w-full min-w-[160px] px-2 text-xs border border-[#3049F5] rounded bg-white"
                      />
                    ) : (
                      <span className="font-medium text-xs">{l.trade}</span>
                    ),
                },
                {
                  key: 'region',
                  header: 'Region',
                  render: (l) =>
                    editingLabId === l.id && editLabDraft ? (
                      <select
                        value={editLabDraft.region}
                        onChange={(e) =>
                          setEditLabDraft({ ...editLabDraft, region: e.target.value })
                        }
                        className="h-8 px-2 text-xs border border-[#3049F5] rounded bg-white"
                      >
                        <option value="Global Standard">Global Standard</option>
                        {regions
                          .filter((r) => r.regionName !== 'Global Standard')
                          .map((r) => (
                            <option key={r.regionName} value={r.regionName}>
                              {r.regionName}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <span className="text-xs text-[#4E5360]">{l.region}</span>
                    ),
                },
                { key: 'unit', header: 'Unit', render: (l) => <span className="font-mono-num text-xs">{l.unit}</span> },
                {
                  key: 'rate',
                  header: `Rate (${priceCurrency})`,
                  align: 'right',
                  render: (l) => {
                    if (editingLabId === l.id && editLabDraft) {
                      return (
                        <input
                          type="number"
                          min={0}
                          step={priceCurrency === 'INR' ? '10' : '0.5'}
                          value={editLabDraft.rateInput}
                          onChange={(e) =>
                            setEditLabDraft({
                              ...editLabDraft,
                              rateInput: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="h-8 w-24 px-2 text-xs text-right font-mono-num border border-[#3049F5] rounded bg-white"
                        />
                      );
                    }
                    const primaryRate =
                      priceCurrency === 'INR' ? l.ratePerUnit * USD_TO_INR : l.ratePerUnit;
                    const secondaryRate =
                      priceCurrency === 'INR'
                        ? formatCurrency(l.ratePerUnit, 'USD', 2)
                        : formatCurrency(l.ratePerUnit * USD_TO_INR, 'INR');
                    return (
                      <div className="text-right font-mono-num">
                        <span className="text-xs font-semibold block">
                          {formatCurrency(primaryRate, priceCurrency, priceCurrency === 'INR' ? 0 : 2)}
                        </span>
                        <span className="text-[10px] text-[#777B87]">{secondaryRate}</span>
                      </div>
                    );
                  },
                },
                {
                  key: 'actions',
                  header: '',
                  align: 'right',
                  render: (l) =>
                    editingLabId === l.id ? (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handleSaveEditLabour}
                          title="Save labour rate"
                          className="p-1.5 text-[#249B67] hover:bg-[#ECFDF5] rounded cursor-pointer"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingLabId(null);
                            setEditLabDraft(null);
                          }}
                          title="Cancel edit"
                          className="p-1.5 text-[#777B87] hover:bg-[#F1F0EC] rounded cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingLabId(l.id);
                            setEditLabDraft({
                              trade: l.trade,
                              unit: l.unit,
                              rateInput: toDisplayFromUsd(l.ratePerUnit, priceCurrency),
                              region: l.region,
                            });
                          }}
                          title="Edit labour rate"
                          className="p-1.5 text-[#3049F5] hover:bg-[#EEF1FF] rounded cursor-pointer"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLabour(l.id)}
                          title="Delete labour rate"
                          className="p-1.5 text-[#777B87] hover:text-[#D94A50] rounded cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ),
                },
              ]}
            />
          </Card>
        </div>
      )}

      {/* REGIONAL PRICE DATABASE */}
      {activeModule === 'admin_regions' && (
        <div className="space-y-4">
          <h1 className="font-display text-xl font-semibold text-[#171923]">
            Regional Price Database
          </h1>
          <Card>
            <form onSubmit={handleAddRegion} className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-end">
              <InputField
                label="Region Name"
                required
                value={newReg.regionName}
                onChange={(e) => setNewReg({ ...newReg, regionName: e.target.value })}
                placeholder="e.g. Australia (Sydney)"
              />
              <InputField
                label="Currency"
                value={newReg.currency}
                onChange={(e) => setNewReg({ ...newReg, currency: e.target.value.toUpperCase() })}
              />
              <InputField
                label="Material Mult."
                type="number"
                step="0.05"
                value={newReg.materialMultiplier}
                onChange={(e) => setNewReg({ ...newReg, materialMultiplier: Number(e.target.value) || 1 })}
              />
              <InputField
                label="Labour Mult."
                type="number"
                step="0.05"
                value={newReg.labourMultiplier}
                onChange={(e) => setNewReg({ ...newReg, labourMultiplier: Number(e.target.value) || 1 })}
              />
              <Button type="submit">
                <Plus size={14} /> Add Region
              </Button>
            </form>
          </Card>
          <Card padding="p-0">
            <DataTable
              rows={regions}
              columns={[
                { key: 'name', header: 'Region', render: (r) => <span className="font-medium text-xs">{r.regionName}</span> },
                { key: 'cur', header: 'Currency', render: (r) => <span className="font-mono-num text-xs">{r.currency}</span> },
                { key: 'mat', header: 'Material Mult.', align: 'right', render: (r) => <span className="font-mono-num text-xs">{Number(r.materialMultiplier ?? 1).toFixed(2)}×</span> },
                { key: 'lab', header: 'Labour Mult.', align: 'right', render: (r) => <span className="font-mono-num text-xs">{Number(r.labourMultiplier ?? 1).toFixed(2)}×</span> },
                { key: 'src', header: 'Price Source', render: (r) => <span className="text-xs text-[#777B87]">{r.priceSource}</span> },
              ]}
            />
          </Card>
        </div>
      )}

      {/* REPORTS */}
      {activeModule === 'admin_reports' && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl font-semibold text-[#171923]">
                Platform Administration Reports
              </h1>
              <p className="text-xs text-[#777B87] mt-0.5">
                Summary of registered users, active projects, and pricing indices.
              </p>
            </div>
            <Button size="sm" onClick={() => window.print()}>
              Print Executive Summary
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono-num">
            <div className="p-3 border border-[#E5E6EB] rounded-lg">
              <span className="text-[#777B87] block">Accounts</span>
              <strong className="text-base">{usersList.length}</strong>
            </div>
            <div className="p-3 border border-[#E5E6EB] rounded-lg">
              <span className="text-[#777B87] block">Projects</span>
              <strong className="text-base">{projectsList.length}</strong>
            </div>
            <div className="p-3 border border-[#E5E6EB] rounded-lg">
              <span className="text-[#777B87] block">Material Items</span>
              <strong className="text-base">{materials.length}</strong>
            </div>
            <div className="p-3 border border-[#E5E6EB] rounded-lg">
              <span className="text-[#777B87] block">Regions</span>
              <strong className="text-base">{regions.length}</strong>
            </div>
          </div>
        </Card>
      )}

      {/* APPLICATION SETTINGS */}
      {activeModule === 'admin_settings' && (
        <Card className="max-w-xl">
          <h1 className="font-display text-xl font-semibold text-[#171923] mb-4">
            Application Settings
          </h1>
          <form onSubmit={handleSaveAppSettings} className="space-y-4">
            <InputField
              label="Max Blueprint Upload Size (MB)"
              type="number"
              value={Number(appSettings.maxUploadSizeMb ?? 15)}
              onChange={(e) =>
                setAppSettings({ ...appSettings, maxUploadSizeMb: Number(e.target.value) || 15 })
              }
            />
            <InputField
              label="AI Confidence Review Threshold (0 - 1)"
              type="number"
              step="0.01"
              value={Number(appSettings.aiConfidenceReviewThreshold ?? 0.82)}
              onChange={(e) =>
                setAppSettings({
                  ...appSettings,
                  aiConfidenceReviewThreshold: Number(e.target.value) || 0.82,
                })
              }
            />
            <Button type="submit">Save Global Settings</Button>
          </form>
        </Card>
      )}

      {/* AUDIT LOGS */}
      {activeModule === 'admin_audit_logs' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-[#3049F5]" />
            <h1 className="font-display text-xl font-semibold text-[#171923]">Audit Logs</h1>
          </div>
          <Card padding="p-0">
            <DataTable
              rows={auditLogs}
              emptyMessage="No audit log entries recorded."
              columns={[
                { key: 'time', header: 'Timestamp', render: (l) => <span className="font-mono-num text-xs text-[#777B87]">{new Date(l.createdAt).toLocaleString()}</span> },
                { key: 'actor', header: 'Actor', render: (l) => <span className="text-xs font-medium">{l.actorEmail}</span> },
                { key: 'action', header: 'Action', render: (l) => <span className="font-mono-num text-xs text-[#3049F5]">{l.action}</span> },
                { key: 'target', header: 'Target', render: (l) => <span className="text-xs">{l.targetType} {l.targetId ? `#${l.targetId}` : ''}</span> },
                { key: 'details', header: 'Details', render: (l) => <span className="text-xs text-[#777B87]">{l.details || '-'}</span> },
              ]}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
