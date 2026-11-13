import React, { useState, useEffect } from 'react';
import {
  DetailedWorkerProfile,
  ServiceRequest,
} from '../types';
import { SAMPLE_WORKERS, SAMPLE_SERVICE_REQUESTS } from '../data/workerData';
import {
  filterWorkers,
  createServiceRequest,
  acceptServiceRequest,
  updateServiceRequestStatus,
  recordWorkCompletion,
  submitHouseholdFeedback,
  raiseComplaintTicket,
} from '../services/workforceMatchingService';
import { WorkerCard } from '../components/workforce/WorkerCard';
import { WorkerProfileModal } from '../components/workforce/WorkerProfileModal';
import { CreateServiceRequestModal } from '../components/workforce/CreateServiceRequestModal';
import { ServiceRequestTrackingCard } from '../components/workforce/ServiceRequestTrackingCard';
import { ComplaintModal } from '../components/workforce/ComplaintModal';
import { WorkerRegistrationModal } from '../components/workforce/WorkerRegistrationModal';
import { Button } from '../components/common/Button';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { useNotification } from '../context/NotificationContext';
import { useApp } from '../context/AppContext';
import { dbService } from '../services/db';
import { syncService } from '../services/syncService';
import {
  Users,
  ShieldCheck,
  Plus,
  Search,
  Briefcase,
  Home,
  CheckCircle2,
  AlertTriangle,
  Lock,
  UserCheck,
  Filter,
  Wrench,
} from 'lucide-react';

export const CommunityWorkforcePage: React.FC = () => {
  const { showNotification } = useNotification();
  const { isOffline, triggerManualSync } = useApp();

  // Mode: Household vs Worker Dashboard
  const [activeMode, setActiveMode] = useState<'household' | 'worker'>('household');

  // Core Data State (Initialized with sample data, persists in component session)
  const [workers, setWorkers] = useState<DetailedWorkerProfile[]>(() => {
    try {
      const saved = localStorage.getItem('urja_saathi_workers');
      return saved ? JSON.parse(saved) : SAMPLE_WORKERS;
    } catch {
      return SAMPLE_WORKERS;
    }
  });

  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>(() => {
    try {
      const saved = localStorage.getItem('urja_saathi_requests');
      return saved ? JSON.parse(saved) : SAMPLE_SERVICE_REQUESTS;
    } catch {
      return SAMPLE_SERVICE_REQUESTS;
    }
  });

  // Load from IndexedDB on initial mount
  useEffect(() => {
    const loadFromDB = async () => {
      try {
        const stored = await dbService.getAllServiceRequests();
        if (stored && stored.length > 0) {
          setServiceRequests(stored);
        } else {
          for (const req of SAMPLE_SERVICE_REQUESTS) {
            await dbService.saveServiceRequest(req);
          }
        }
      } catch (e) {
        console.warn('Failed to load service requests from IndexedDB:', e);
      }
    };
    loadFromDB();
  }, []);

  // Active Worker selected when in Worker Dashboard mode
  const [activeWorkerId, setActiveWorkerId] = useState<string>(SAMPLE_WORKERS[0].id);

  // Household Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);

  // Modals state
  const [selectedWorkerForProfile, setSelectedWorkerForProfile] = useState<DetailedWorkerProfile | null>(null);
  const [isCreateRequestOpen, setIsCreateRequestOpen] = useState(false);
  const [preselectedWorkerForBooking, setPreselectedWorkerForBooking] = useState<DetailedWorkerProfile | null>(null);
  const [requestForComplaint, setRequestForComplaint] = useState<ServiceRequest | null>(null);
  const [isWorkerRegisterOpen, setIsWorkerRegisterOpen] = useState(false);

  // Persist state updates to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('urja_saathi_workers', JSON.stringify(workers));
    } catch (e) {
      console.warn('LocalStorage save failed for workers:', e);
    }
  }, [workers]);

  useEffect(() => {
    try {
      localStorage.setItem('urja_saathi_requests', JSON.stringify(serviceRequests));
    } catch (e) {
      console.warn('LocalStorage save failed for requests:', e);
    }
  }, [serviceRequests]);

  const activeWorker = workers.find((w) => w.id === activeWorkerId) || workers[0];

  // -------------------------------------------------------------
  // HOUSEHOLD HANDLERS
  // -------------------------------------------------------------
  const handleCreateRequest = async (
    data: Omit<ServiceRequest, 'id' | 'createdAt' | 'status' | 'isTechnical'>
  ) => {
    try {
      const newReq = createServiceRequest(data);
      await dbService.saveServiceRequest(newReq);
      setServiceRequests([newReq, ...serviceRequests]);

      await syncService.enqueueOfflineAction(
        'service_request',
        'create',
        newReq,
        `idem_req_${newReq.id}`
      );

      if (isOffline) {
        showNotification(
          'info',
          'Saved in Offline Queue',
          `Request "${newReq.title}" is saved locally. It will automatically sync when connection returns.`
        );
      } else {
        await triggerManualSync();
        showNotification('success', 'Service Request Dispatched', `Request "${newReq.title}" has been registered.`);
      }
    } catch (err: any) {
      showNotification('error', 'Request Creation Failed', err.message);
    }
  };

  const handleCancelRequest = async (req: ServiceRequest) => {
    const updated = updateServiceRequestStatus(req, 'cancelled');
    await dbService.saveServiceRequest(updated);
    setServiceRequests(serviceRequests.map((r) => (r.id === req.id ? updated : r)));
    await syncService.enqueueOfflineAction('service_request', 'update', updated, `idem_cancel_${req.id}`);
    showNotification('info', 'Request Cancelled', `Service request "${req.title}" was cancelled.`);
  };

  const handleSubmitFeedback = async (req: ServiceRequest, rating: number, review: string) => {
    const updated = submitHouseholdFeedback(req, rating, review);
    await dbService.saveServiceRequest(updated);
    setServiceRequests(serviceRequests.map((r) => (r.id === req.id ? updated : r)));
    await syncService.enqueueOfflineAction('service_request', 'update', updated, `idem_feedback_${req.id}`);
    showNotification('success', 'Review Submitted', 'Thank you for rating your service experience!');
  };

  const handleRaiseComplaint = (
    requestId: string,
    issueType: 'safety_concern' | 'unqualified_work' | 'overcharging' | 'no_show' | 'other',
    details: string
  ) => {
    const target = serviceRequests.find((r) => r.id === requestId);
    if (!target) return;
    const updated = raiseComplaintTicket(target, issueType, details);
    setServiceRequests(serviceRequests.map((r) => (r.id === requestId ? updated : r)));
    showNotification(
      'warning',
      'Complaint Ticket Raised',
      `Ticket #${updated.complaintTicket?.id} recorded. Our safety coordinator will audit this concern.`
    );
  };

  // -------------------------------------------------------------
  // WORKER HANDLERS
  // -------------------------------------------------------------
  const handleAcceptRequest = async (req: ServiceRequest) => {
    try {
      const updated = acceptServiceRequest(req, activeWorker);
      await dbService.saveServiceRequest(updated);
      setServiceRequests(serviceRequests.map((r) => (r.id === req.id ? updated : r)));
      await syncService.enqueueOfflineAction('service_request', 'update', updated, `idem_accept_${req.id}`);
      showNotification('success', 'Job Accepted', `You have accepted "${req.title}". Contact details are unlocked.`);
    } catch (err: any) {
      showNotification('error', 'Cannot Accept Task', err.message);
    }
  };

  const handleRejectRequest = (req: ServiceRequest) => {
    showNotification('info', 'Task Passed', `You passed on "${req.title}".`);
  };

  const handleStartJob = async (req: ServiceRequest) => {
    const updated = updateServiceRequestStatus(req, 'in_progress');
    await dbService.saveServiceRequest(updated);
    setServiceRequests(serviceRequests.map((r) => (r.id === req.id ? updated : r)));
    await syncService.enqueueOfflineAction('service_request', 'update', updated, `idem_start_${req.id}`);
    showNotification('info', 'Job In Progress', `Marked "${req.title}" as active on site.`);
  };

  const handleCompleteJob = async (
    req: ServiceRequest,
    paymentInr: number,
    paymentMethod: 'cash' | 'upi' | 'waived',
    notes: string
  ) => {
    const updated = recordWorkCompletion(req, paymentInr, paymentMethod, notes);
    await dbService.saveServiceRequest(updated);
    setServiceRequests(serviceRequests.map((r) => (r.id === req.id ? updated : r)));
    await syncService.enqueueOfflineAction('service_request', 'update', updated, `idem_complete_${req.id}`);
    showNotification('success', 'Work Completed', `Service completed and payment of ₹${paymentInr} recorded.`);
  };

  const handleToggleWorkerAvailability = () => {
    const updatedWorker = { ...activeWorker, isAvailableToday: !activeWorker.isAvailableToday };
    setWorkers(workers.map((w) => (w.id === activeWorker.id ? updatedWorker : w)));
    showNotification(
      'info',
      'Availability Updated',
      `You are now ${updatedWorker.isAvailableToday ? 'ONLINE and available for jobs' : 'OFFLINE'}.`
    );
  };

  const handleSaveWorkerProfile = (savedProfile: DetailedWorkerProfile) => {
    const exists = workers.some((w) => w.id === savedProfile.id);
    let updated: DetailedWorkerProfile[];
    if (exists) {
      updated = workers.map((w) => (w.id === savedProfile.id ? savedProfile : w));
    } else {
      updated = [...workers, savedProfile];
      setActiveWorkerId(savedProfile.id);
    }
    setWorkers(updated);
    showNotification('success', 'Profile Saved', `Worker profile for ${savedProfile.name} was updated.`);
  };

  // Filtered workers list for Household directory
  const filteredWorkers = filterWorkers(workers, {
    searchQuery,
    category: categoryFilter,
    verifiedOnly,
    availableOnly,
  });

  // Filtered requests for Household view (all requests in session)
  const householdRequests = serviceRequests;

  // Filtered requests for Worker view
  // 1. Available requests (status: 'pending') that are eligible for this worker
  const availableWorkerRequests = serviceRequests.filter(
    (r) => r.status === 'pending'
  );

  // 2. Worker's active and completed jobs
  const myWorkerJobs = serviceRequests.filter(
    (r) => r.assignedWorkerId === activeWorker.id
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-forest-950 via-forest-900 to-forest-800 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 max-w-4xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
            <Users className="h-3.5 w-3.5 text-emerald-400" />
            Har Ghar Bachat, Har Haath Kaam • Community Workforce
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
            Community Energy Worker & Service Matching
          </h1>
          <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
            Connecting households with independently verified Surya Mitra solar technicians, licensed wiremen,
            and non-technical community energy guides. Strict licensing checks prevent unqualified electrical work,
            with zero solar sales kickbacks.
          </p>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* DUAL INTERFACE TOGGLE TABS */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-center max-w-md mx-auto">
        <button
          type="button"
          onClick={() => setActiveMode('household')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeMode === 'household'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Home className="h-4 w-4" />
          <span>Household Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('worker')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeMode === 'worker'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Briefcase className="h-4 w-4" />
          <span>Worker Portal</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* INTERFACE 1: HOUSEHOLD DASHBOARD VIEW                          */}
      {/* ============================================================== */}
      {activeMode === 'household' ? (
        <div className="space-y-8">
          {/* Household KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Verified Technicians"
              value={workers.filter((w) => w.verificationStatus === 'verified_licensed').length}
              subtitle="Licensed Wiremen & Surya Mitras"
              icon={<ShieldCheck className="h-5 w-5 text-emerald-600" />}
            />
            <StatCard
              title="Community Energy Guides"
              value={workers.filter((w) => w.roleCategory === 'community_energy_guide').length}
              subtitle="Non-technical bill & portal guides"
              icon={<Users className="h-5 w-5 text-amber-600" />}
            />
            <StatCard
              title="Active Service Requests"
              value={householdRequests.filter((r) => r.status !== 'completed' && r.status !== 'cancelled').length}
              subtitle="Dispatched in your locality"
              icon={<Wrench className="h-5 w-5 text-sky-600" />}
            />
            <StatCard
              title="Verified Work Guarantee"
              value="100%"
              subtitle="Zero sales referral commissions"
              icon={<UserCheck className="h-5 w-5 text-forest-700" />}
            />
          </div>

          {/* Household Service Requests Tracking Section */}
          {householdRequests.length > 0 && (
            <div className="space-y-4 bg-slate-50/70 p-5 rounded-3xl border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-emerald-600" />
                    Your Tracked Service Requests
                  </h3>
                  <p className="text-xs text-slate-500">
                    Track status, confirm completed visits, submit ratings, or lodge complaints.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setPreselectedWorkerForBooking(null);
                    setIsCreateRequestOpen(true);
                  }}
                  icon={<Plus className="h-4 w-4" />}
                >
                  Create Request
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {householdRequests.map((req) => (
                  <ServiceRequestTrackingCard
                    key={req.id}
                    request={req}
                    mode="household"
                    onCancelRequest={handleCancelRequest}
                    onCompleteJob={handleCompleteJob}
                    onSubmitFeedback={handleSubmitFeedback}
                    onRaiseComplaint={(r) => setRequestForComplaint(r)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Search, Filter & Action Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search by worker name, locality, skills, or certification (e.g. Surya Mitra)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <Button
                variant="primary"
                onClick={() => {
                  setPreselectedWorkerForBooking(null);
                  setIsCreateRequestOpen(true);
                }}
                icon={<Plus className="h-4 w-4" />}
                className="shrink-0"
              >
                Request Service Visit
              </Button>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-500 flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5" /> Filter Role:
                </span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="text-xs p-1.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="all">All Worker Roles</option>
                  <option value="surya_mitra_technician">Surya Mitra (Solar Tech)</option>
                  <option value="licensed_wireman">Licensed Wireman (Electrician)</option>
                  <option value="energy_auditor">BEE Energy Auditor</option>
                  <option value="community_energy_guide">Community Energy Guide</option>
                </select>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="h-3.5 w-3.5 rounded text-emerald-600"
                  />
                  <span>Govt Verified License Only</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(e) => setAvailableOnly(e.target.checked)}
                    className="h-3.5 w-3.5 rounded text-emerald-600"
                  />
                  <span>Available Today</span>
                </label>
              </div>
            </div>
          </div>

          {/* Workers Directory Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Showing {filteredWorkers.length} practitioners in directory</span>
              <span className="italic">All demo profiles clearly labeled for hackathon verification</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWorkers.map((worker) => (
                <WorkerCard
                  key={worker.id}
                  worker={worker}
                  onViewProfile={(w) => setSelectedWorkerForProfile(w)}
                  onBook={(w) => {
                    setPreselectedWorkerForBooking(w);
                    setIsCreateRequestOpen(true);
                  }}
                />
              ))}
            </div>

            {filteredWorkers.length === 0 && (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-2 max-w-md mx-auto">
                <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">No matching workers found</h4>
                <p className="text-xs text-slate-500">
                  Try adjusting your filter keywords or clearing the "Govt Verified Only" toggle.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* INTERFACE 2: WORKER DASHBOARD VIEW                             */
        /* ============================================================== */
        <div className="space-y-8">
          {/* Worker Profile Switcher (For demo walkthrough) */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Active Worker Profile Switcher (Demo Mode)
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={activeWorkerId}
                  onChange={(e) => setActiveWorkerId(e.target.value)}
                  className="text-sm font-bold text-slate-900 rounded-xl border border-slate-300 p-2 bg-slate-50 focus:ring-2 focus:ring-emerald-500"
                >
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} — {w.roleCategory.replace(/_/g, ' ')} ({w.verificationStatus.replace(/_/g, ' ')})
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsWorkerRegisterOpen(true)}
                  icon={<Plus className="h-3.5 w-3.5" />}
                >
                  Register Profile
                </Button>
              </div>
            </div>

            {/* Availability Toggle */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-600 block">Status:</span>
                <span
                  className={`text-xs font-bold ${
                    activeWorker.isAvailableToday ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  {activeWorker.isAvailableToday ? 'ONLINE (Accepting Jobs)' : 'OFFLINE'}
                </span>
              </div>
              <Button
                variant={activeWorker.isAvailableToday ? 'primary' : 'outline'}
                size="sm"
                onClick={handleToggleWorkerAvailability}
              >
                {activeWorker.isAvailableToday ? 'Go Offline' : 'Go Online'}
              </Button>
            </div>
          </div>

          {/* Active Worker Profile Highlight Card */}
          <div className="bg-gradient-to-r from-slate-900 to-forest-950 text-white p-6 rounded-3xl space-y-4 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black">{activeWorker.name}</h3>
                  <Badge variant="emerald" size="sm">
                    {activeWorker.roleCategory.replace(/_/g, ' ')}
                  </Badge>
                  {activeWorker.verificationStatus === 'verified_licensed' ? (
                    <Badge variant="emerald" size="sm" icon={<ShieldCheck className="h-3 w-3" />}>
                      Govt Verified
                    </Badge>
                  ) : (
                    <Badge variant="amber" size="sm">
                      {activeWorker.verificationStatus.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  {activeWorker.locality} ({activeWorker.pincode}) • Standard Rate: ₹{activeWorker.hourlyRateInr}/hr
                </p>
              </div>

              <div className="text-left sm:text-right text-xs space-y-1">
                <div>Rating: <span className="font-bold text-amber-400">{activeWorker.rating}★</span> ({activeWorker.reviewCount} reviews)</div>
                <div className="text-emerald-400 font-semibold">{activeWorker.completedJobsCount} jobs completed</div>
              </div>
            </div>

            {/* Non-Technical Guide Safety Mandate Notice */}
            {activeWorker.roleCategory === 'community_energy_guide' && (
              <div className="p-3 bg-amber-500/20 border border-amber-400/40 rounded-xl text-xs text-amber-200 flex items-start gap-2">
                <Lock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Community Energy Guide Safety Boundary:</strong> You are qualified for vernacular electricity bill literacy, tariff slab explanations, and PM Surya Ghar application document checklists. For public safety, technical electrical wiring and rooftop solar PV installations are restricted to licensed technicians.
                </p>
              </div>
            )}
          </div>

          {/* WORKER WORK PIPELINE: AVAILABLE REQUESTS VS MY ACTIVE JOBS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column 1: Available Community Requests in Locality */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 text-emerald-600" />
                    Available Dispatch Requests in Your Circle
                  </h4>
                  <p className="text-xs text-slate-500">
                    Requests awaiting worker acceptance in {activeWorker.locality.split(',')[0]}
                  </p>
                </div>
                <Badge variant="slate" size="sm">
                  {availableWorkerRequests.length} Open
                </Badge>
              </div>

              {availableWorkerRequests.map((req) => (
                <ServiceRequestTrackingCard
                  key={req.id}
                  request={req}
                  mode="worker"
                  currentWorker={activeWorker}
                  onAccept={handleAcceptRequest}
                  onReject={handleRejectRequest}
                />
              ))}

              {availableWorkerRequests.length === 0 && (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400 space-y-1">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
                  <p className="font-bold text-slate-700">No open requests in queue</p>
                  <p>All service requests in your locality have been assigned.</p>
                </div>
              )}
            </div>

            {/* Column 2: My Accepted & Active Jobs */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    My Active & Completed Pipeline
                  </h4>
                  <p className="text-xs text-slate-500">
                    Jobs assigned to {activeWorker.name}
                  </p>
                </div>
                <Badge variant="emerald" size="sm">
                  {myWorkerJobs.length} Jobs
                </Badge>
              </div>

              {myWorkerJobs.map((req) => (
                <ServiceRequestTrackingCard
                  key={req.id}
                  request={req}
                  mode="worker"
                  currentWorker={activeWorker}
                  onStartJob={handleStartJob}
                  onCompleteJob={handleCompleteJob}
                />
              ))}

              {myWorkerJobs.length === 0 && (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400 space-y-1">
                  <Briefcase className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                  <p className="font-bold text-slate-700">No active assigned jobs</p>
                  <p>Accept an open dispatch from the left panel to begin work.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* 1. Worker Profile Details Modal */}
      <WorkerProfileModal
        isOpen={Boolean(selectedWorkerForProfile)}
        onClose={() => setSelectedWorkerForProfile(null)}
        worker={selectedWorkerForProfile}
        onBook={(w) => {
          setPreselectedWorkerForBooking(w);
          setIsCreateRequestOpen(true);
        }}
      />

      {/* 2. Create Service Request Modal */}
      <CreateServiceRequestModal
        isOpen={isCreateRequestOpen}
        onClose={() => setIsCreateRequestOpen(false)}
        onSubmit={handleCreateRequest}
        preselectedWorker={preselectedWorkerForBooking}
        availableWorkers={workers}
      />

      {/* 3. File Complaint Modal */}
      <ComplaintModal
        isOpen={Boolean(requestForComplaint)}
        onClose={() => setRequestForComplaint(null)}
        request={requestForComplaint}
        onSubmitComplaint={handleRaiseComplaint}
      />

      {/* 4. Worker Registration Modal */}
      <WorkerRegistrationModal
        isOpen={isWorkerRegisterOpen}
        onClose={() => setIsWorkerRegisterOpen(false)}
        onSaveWorker={handleSaveWorkerProfile}
      />
    </div>
  );
};
