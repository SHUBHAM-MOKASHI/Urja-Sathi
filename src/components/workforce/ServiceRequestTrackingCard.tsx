import React, { useState } from 'react';
import { ServiceRequest, DetailedWorkerProfile } from '../../types';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { formatCurrency } from '../../utils/formatters';
import {
  MapPin,
  Phone,
  CheckCircle2,
  XCircle,
  Star,
  ShieldAlert,
} from 'lucide-react';

interface ServiceRequestTrackingCardProps {
  request: ServiceRequest;
  mode: 'household' | 'worker';
  currentWorker?: DetailedWorkerProfile | null;
  onAccept?: (request: ServiceRequest) => void;
  onReject?: (request: ServiceRequest) => void;
  onStartJob?: (request: ServiceRequest) => void;
  onCompleteJob?: (request: ServiceRequest, paymentInr: number, paymentMethod: 'cash' | 'upi' | 'waived', notes: string) => void;
  onCancelRequest?: (request: ServiceRequest) => void;
  onSubmitFeedback?: (request: ServiceRequest, rating: number, review: string) => void;
  onRaiseComplaint?: (request: ServiceRequest) => void;
}

export const ServiceRequestTrackingCard: React.FC<ServiceRequestTrackingCardProps> = ({
  request,
  mode,
  currentWorker,
  onAccept,
  onReject,
  onStartJob,
  onCompleteJob,
  onCancelRequest,
  onSubmitFeedback,
  onRaiseComplaint,
}) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(300);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'waived'>('upi');
  const [completionNotes, setCompletionNotes] = useState('');

  const [isGivingFeedback, setIsGivingFeedback] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  const getStatusBadge = () => {
    switch (request.status) {
      case 'pending':
        return <Badge variant="amber" size="sm">Pending Acceptance</Badge>;
      case 'accepted':
        return <Badge variant="blue" size="sm">Accepted & Scheduled</Badge>;
      case 'in_progress':
        return <Badge variant="forest" size="sm">Active In Progress</Badge>;
      case 'completed':
        return <Badge variant="emerald" size="sm" icon={<CheckCircle2 className="h-3 w-3" />}>Service Completed</Badge>;
      case 'cancelled':
        return <Badge variant="slate" size="sm" icon={<XCircle className="h-3 w-3" />}>Cancelled</Badge>;
    }
  };

  const handleFinishCompletion = (e: React.FormEvent) => {
    e.preventDefault();
    if (onCompleteJob) {
      onCompleteJob(request, paymentAmount, paymentMethod, completionNotes);
      setIsCompleting(false);
    }
  };

  const handleFinishFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmitFeedback) {
      onSubmitFeedback(request, rating, reviewText);
      setIsGivingFeedback(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {request.isTechnical ? (
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Technical Task
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Non-Technical Guidance
              </span>
            )}
          </div>
          <h4 className="text-base font-bold text-slate-900 tracking-tight pt-1">
            {request.title}
          </h4>
        </div>

        <span className="text-xs text-slate-400 font-medium">
          Slot: {request.preferredDate} ({request.preferredTimeSlot.split(' ')[0]})
        </span>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
        {request.description}
      </p>

      {/* Meta details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span>{request.locality} ({request.pincode})</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span>
            {mode === 'worker' && request.status === 'pending'
              ? 'Contact phone revealed upon accepting request'
              : `${request.householdName} • ${request.householdPhone}`}
          </span>
        </div>
      </div>

      {request.assignedWorkerName && (
        <div className="text-xs font-semibold text-slate-800 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100 flex items-center justify-between">
          <span className="text-emerald-950">Assigned Practitioner:</span>
          <span className="text-emerald-800 font-bold">{request.assignedWorkerName}</span>
        </div>
      )}

      {/* Complaint Ticket Notice if Raised */}
      {request.complaintTicket && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-rose-600" />
            Complaint Ticket #{request.complaintTicket.id} ({request.complaintTicket.status.toUpperCase()})
          </div>
          <p className="text-[11px] text-rose-700 leading-relaxed">
            Issue: {request.complaintTicket.issueType.replace(/_/g, ' ')} — {request.complaintTicket.description}
          </p>
        </div>
      )}

      {/* Completed work notes & payment summary */}
      {request.status === 'completed' && request.paymentRecordedInr !== undefined && (
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
          <div className="flex justify-between font-bold text-slate-800">
            <span>Payment Recorded:</span>
            <span className="text-emerald-700">
              {formatCurrency(request.paymentRecordedInr)} ({request.paymentMethod?.toUpperCase()})
            </span>
          </div>
          {request.workCompletionNotes && (
            <p className="text-[11px] text-slate-500 pt-1">
              Work Notes: {request.workCompletionNotes}
            </p>
          )}
        </div>
      )}

      {/* Household Feedback if submitted */}
      {request.householdFeedback && (
        <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200/80 text-xs space-y-1">
          <div className="flex items-center gap-1 text-amber-700 font-bold">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
            <span>Household Rating: {request.householdFeedback.rating} / 5 Stars</span>
          </div>
          <p className="text-[11px] text-slate-700 italic">
            "{request.householdFeedback.reviewText}"
          </p>
        </div>
      )}

      {/* Worker Job Completion Inline Form */}
      {isCompleting && (
        <form onSubmit={handleFinishCompletion} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
          <span className="font-bold text-slate-900 block">Record Completed Service & Payment</span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-600 mb-1">Labor Fee Collected (₹)</label>
              <input
                type="number"
                min="0"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="w-full p-2 bg-white rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full p-2 bg-white rounded-lg border border-slate-300"
              >
                <option value="upi">UPI Digital</option>
                <option value="cash">Cash on Hand</option>
                <option value="waived">Waived / Subsidized</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-slate-600 mb-1">Summary of Serviced Components / Notes</label>
            <input
              type="text"
              placeholder="e.g. Tightened terminal screws, replaced 16A MCB"
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              className="w-full p-2 bg-white rounded-lg border border-slate-300"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsCompleting(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Confirm & Complete Task
            </Button>
          </div>
        </form>
      )}

      {/* Household Feedback Inline Form */}
      {isGivingFeedback && (
        <form onSubmit={handleFinishFeedback} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
          <span className="font-bold text-slate-900 block">Rate & Review Worker Service</span>
          <div>
            <label className="block text-slate-600 mb-1">Rating (1 to 5 Stars)</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`h-5 w-5 ${
                      star <= rating ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
              <span className="font-bold text-slate-700 ml-2">{rating} Stars</span>
            </div>
          </div>
          <div>
            <label className="block text-slate-600 mb-1">Written Review</label>
            <input
              type="text"
              placeholder="Was the worker punctual, safe, and transparent?"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="w-full p-2 bg-white rounded-lg border border-slate-300"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsGivingFeedback(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Submit Review
            </Button>
          </div>
        </form>
      )}

      {/* Card Action Buttons */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        {mode === 'household' ? (
          /* Household Actions */
          <>
            <div className="flex items-center gap-2">
              {request.status !== 'completed' && request.status !== 'cancelled' && onCancelRequest && (
                <Button variant="ghost" size="sm" onClick={() => onCancelRequest(request)} className="text-rose-600 hover:bg-rose-50">
                  Cancel Request
                </Button>
              )}
              {onRaiseComplaint && !request.complaintTicket && (
                <button
                  type="button"
                  onClick={() => onRaiseComplaint(request)}
                  className="text-xs font-semibold text-rose-700 hover:text-rose-800 hover:underline flex items-center gap-1"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Report Issue
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {request.status === 'in_progress' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (onCompleteJob) {
                      onCompleteJob(request, 300, 'upi', 'Household confirmed job completion.');
                    }
                  }}
                >
                  Confirm Completion
                </Button>
              )}
              {request.status === 'completed' && !request.householdFeedback && (
                <Button variant="outline" size="sm" onClick={() => setIsGivingFeedback(true)}>
                  Submit Rating & Feedback
                </Button>
              )}
            </div>
          </>
        ) : (
          /* Worker Actions */
          <>
            <div className="flex items-center gap-2">
              {request.status === 'pending' && onReject && (
                <Button variant="ghost" size="sm" onClick={() => onReject(request)}>
                  Pass Request
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {request.status === 'pending' && onAccept && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onAccept(request)}
                  disabled={request.isTechnical && currentWorker?.roleCategory === 'community_energy_guide'}
                >
                  Accept Service Task
                </Button>
              )}
              {request.status === 'accepted' && onStartJob && (
                <Button variant="primary" size="sm" onClick={() => onStartJob(request)}>
                  Start Task (On Site)
                </Button>
              )}
              {request.status === 'in_progress' && (
                <Button variant="primary" size="sm" onClick={() => setIsCompleting(true)}>
                  Record Payment & Complete
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
