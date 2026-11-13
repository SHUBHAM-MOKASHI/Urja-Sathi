import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { ServiceRequest } from '../../types';
import { ShieldAlert } from 'lucide-react';

interface ComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: ServiceRequest | null;
  onSubmitComplaint: (
    requestId: string,
    issueType: 'safety_concern' | 'unqualified_work' | 'overcharging' | 'no_show' | 'other',
    details: string
  ) => void;
}

export const ComplaintModal: React.FC<ComplaintModalProps> = ({
  isOpen,
  onClose,
  request,
  onSubmitComplaint,
}) => {
  const [issueType, setIssueType] = useState<
    'safety_concern' | 'unqualified_work' | 'overcharging' | 'no_show' | 'other'
  >('safety_concern');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!request) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.trim()) {
      setError('Please provide specific details of the complaint or safety concern.');
      return;
    }

    onSubmitComplaint(request.id, issueType, details.trim());
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="File Complaint or Safety Concern"
      description={`Report an issue regarding service request "${request.title}".`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-800 rounded-xl">
            {error}
          </div>
        )}

        <div className="bg-rose-50/50 border border-rose-200 p-3 rounded-xl text-xs text-rose-950 flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            URJA SAATHI takes safety violations, uncertified electrical handling, and overcharging seriously.
            Complaints are recorded with a tracking ticket and reviewed against worker licensing records.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Complaint Category *
          </label>
          <select
            value={issueType}
            onChange={(e) => setIssueType(e.target.value as any)}
            className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
          >
            <option value="safety_concern">Safety Protocol Concern (e.g. Uninsulated tools, no PPE)</option>
            <option value="unqualified_work">Unqualified / Defective Workmanship</option>
            <option value="overcharging">Overcharging / Rates Exceeding Platform Estimate</option>
            <option value="no_show">Technician No-Show / Unannounced Delay</option>
            <option value="other">Other Concern</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Specific Incident Details *
          </label>
          <textarea
            rows={4}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Describe what occurred, dates, and any damages or safety issues observed..."
            className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" className="bg-rose-600 hover:bg-rose-700">
            Submit Complaint Ticket
          </Button>
        </div>
      </form>
    </Modal>
  );
};
