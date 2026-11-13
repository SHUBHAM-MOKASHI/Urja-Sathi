import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  GovernmentScheme,
  UserSchemeReadinessInput,
  SchemeReadinessResult,
} from '../../types';
import { evaluateSchemeReadiness, isPolicyOutdated } from '../../services/schemeGuidanceService';
import { formatCurrency } from '../../utils/formatters';
import {
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Building,
  CheckSquare,
  Square,
} from 'lucide-react';

interface SchemeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheme: GovernmentScheme | null;
  initialState?: string;
  initialDiscom?: string;
}

export const SchemeDetailModal: React.FC<SchemeDetailModalProps> = ({
  isOpen,
  onClose,
  scheme,
  initialState = 'Madhya Pradesh',
  initialDiscom = 'all',
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'eligibility' | 'documents' | 'roadmap'>('overview');

  // Interactive user profile state for the eligibility & document checker
  const [userInput, setUserInput] = useState<UserSchemeReadinessInput>({
    selectedState: initialState,
    selectedDiscom: initialDiscom,
    consumerType: 'domestic',
    hasActiveConnection: true,
    hasNoOutstandingDues: true,
    roofOwnership: 'owned_individual',
    hasRwaNoc: false,
    bankAadhaarLinked: true,
    nameMatchesAcrossDocAndBank: true,
    checkedDocumentIds: [],
    checkedCriteriaIds: [],
  });

  if (!scheme) return null;

  const isOutdated = isPolicyOutdated(scheme.lastVerifiedDate, scheme.isUnverifiedOrOutdated);
  const evaluation: SchemeReadinessResult = evaluateSchemeReadiness(scheme, userInput);

  const toggleDocument = (docId: string) => {
    const current = userInput.checkedDocumentIds || [];
    const updated = current.includes(docId)
      ? current.filter((id) => id !== docId)
      : [...current, docId];
    setUserInput({ ...userInput, checkedDocumentIds: updated });
  };

  const toggleCriterion = (critId: string) => {
    const current = userInput.checkedCriteriaIds || [];
    const updated = current.includes(critId)
      ? current.filter((id) => id !== critId)
      : [...current, critId];
    setUserInput({ ...userInput, checkedCriteriaIds: updated });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={scheme.name}
      description={scheme.tagline}
      maxWidth="5xl"
    >
      <div className="space-y-6">
        {/* Policy Verification & Official Source Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border bg-slate-50 border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            {isOutdated ? (
              <Badge variant="amber" size="sm" icon={<AlertTriangle className="h-3 w-3" />}>
                Policy Verification Pending
              </Badge>
            ) : (
              <Badge variant="emerald" size="sm" icon={<ShieldCheck className="h-3 w-3" />}>
                Verified Circular ({scheme.lastVerifiedDate})
              </Badge>
            )}
            <span className="text-slate-500 font-medium truncate">
              Order: {scheme.gazetteNotificationNumber || scheme.policyVersion}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={scheme.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-emerald-700 flex items-center gap-1 font-medium hover:underline"
            >
              <span>Source Circular</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href={scheme.officialApplicationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg hover:bg-emerald-200 transition-colors"
            >
              <span>Official Portal</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-2 sm:gap-4 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-1 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            1. Overview & Subsidy Slabs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('eligibility')}
            className={`pb-3 px-1 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'eligibility'
                ? 'border-emerald-600 text-emerald-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>2. Eligibility Checker</span>
            {evaluation.criticalWarnings.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`pb-3 px-1 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'documents'
                ? 'border-emerald-600 text-emerald-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>3. Required Documents</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 rounded-full text-slate-600">
              {evaluation.documentReadinessPercent}%
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roadmap')}
            className={`pb-3 px-1 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'roadmap'
                ? 'border-emerald-600 text-emerald-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            4. Official Application Roadmap
          </button>
        </div>

        {/* TAB 1: OVERVIEW & SUBSIDY SLABS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100 space-y-2">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block">
                Administering Authority
              </span>
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Building className="h-4 w-4 text-emerald-700" />
                {scheme.administeringAgency}
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Policy Window: Active from {scheme.validFrom} to {scheme.validUntil}.
              </p>
            </div>

            {/* Slabs Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Financial Assistance & Subsidy Slabs
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="p-3 font-bold w-1/3">Capacity / Category</th>
                      <th className="p-3 font-bold w-1/3">Government Assistance Formula</th>
                      <th className="p-3 font-bold w-1/3">Subsidy Cap (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {scheme.slabs.map((slab, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-800">
                          <div>{slab.capacityRange}</div>
                          {slab.notes && (
                            <div className="text-[11px] text-slate-400 font-normal mt-0.5">{slab.notes}</div>
                          )}
                        </td>
                        <td className="p-3 text-slate-700 font-medium">{slab.subsidyFormula}</td>
                        <td className="p-3 font-bold text-emerald-700 text-sm">
                          {slab.maxSubsidyInr > 0 ? formatCurrency(slab.maxSubsidyInr) : 'As per formula'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Common Rejection Reasons to Avoid */}
            <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                Top Reasons Government Subsidies Get Rejected:
              </h4>
              <ul className="text-xs text-rose-800 space-y-1 list-disc list-inside">
                {scheme.commonRejectionReasons.map((reason, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* TAB 2: ELIGIBILITY CHECKER */}
        {activeTab === 'eligibility' && (
          <div className="space-y-6">
            {/* Live Verdict Banner */}
            <div
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                evaluation.eligibilityStatus === 'eligible'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : evaluation.eligibilityStatus === 'ineligible'
                  ? 'bg-rose-50 border-rose-200 text-rose-950'
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-sm">
                  {evaluation.eligibilityStatus === 'eligible' ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <span>Likely Eligible for Subsidy Sanction</span>
                    </>
                  ) : evaluation.eligibilityStatus === 'ineligible' ? (
                    <>
                      <XCircle className="h-5 w-5 text-rose-600" />
                      <span>Ineligible under Current Tariff or Profile Criteria</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      <span>Conditional Eligibility: Critical Actions Required</span>
                    </>
                  )}
                </div>
                <p className="text-xs leading-relaxed text-slate-700">
                  {evaluation.eligibilityStatus === 'eligible'
                    ? 'Your connection, roof rights, and banking profile meet mandatory scheme requirements.'
                    : evaluation.eligibilityStatus === 'ineligible'
                    ? 'Government rooftop solar guidelines restrict this subsidy category to domestic consumers.'
                    : 'Resolve the critical warnings below before filing your official portal application.'}
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs font-semibold text-slate-500 block">Criteria Match</span>
                <span className="text-2xl font-black text-slate-900">
                  {evaluation.eligibilityScorePercent}%
                </span>
              </div>
            </div>

            {/* Critical Warnings */}
            {evaluation.criticalWarnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  Identified Obstacles & Remedial Actions:
                </h4>
                <div className="space-y-2">
                  {evaluation.criticalWarnings.map((warn, i) => (
                    <div
                      key={i}
                      className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 leading-relaxed font-medium"
                    >
                      {warn}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interactive Profile Controls */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Verify Your Specific Household Details
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Electricity Connection Category
                  </label>
                  <select
                    value={userInput.consumerType}
                    onChange={(e) =>
                      setUserInput({ ...userInput, consumerType: e.target.value as any })
                    }
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                  >
                    <option value="domestic">Domestic / Residential (LT-1)</option>
                    <option value="commercial">Commercial (Shop / Office)</option>
                    <option value="agricultural">Agricultural Pump</option>
                    <option value="industrial">Industrial</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Rooftop Title & Rights
                  </label>
                  <select
                    value={userInput.roofOwnership}
                    onChange={(e) =>
                      setUserInput({ ...userInput, roofOwnership: e.target.value as any })
                    }
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                  >
                    <option value="owned_individual">Individually Owned Terrace</option>
                    <option value="owned_shared_apartment">Apartment / Shared Terrace</option>
                    <option value="tenant">Rented Property (Tenant)</option>
                  </select>
                </div>
              </div>

              {userInput.roofOwnership === 'owned_shared_apartment' && (
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={Boolean(userInput.hasRwaNoc)}
                    onChange={(e) => setUserInput({ ...userInput, hasRwaNoc: e.target.checked })}
                    className="h-4 w-4 rounded text-emerald-600"
                  />
                  <span>I possess a formal written Society / RWA NOC resolution</span>
                </label>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(userInput.bankAadhaarLinked)}
                    onChange={(e) => setUserInput({ ...userInput, bankAadhaarLinked: e.target.checked })}
                    className="h-4 w-4 rounded text-emerald-600"
                  />
                  <span>Bank account is mapped on NPCI Aadhaar DBT mapper</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(userInput.nameMatchesAcrossDocAndBank)}
                    onChange={(e) =>
                      setUserInput({ ...userInput, nameMatchesAcrossDocAndBank: e.target.checked })
                    }
                    className="h-4 w-4 rounded text-emerald-600"
                  />
                  <span>Name on bill exactly matches bank passbook & Aadhaar</span>
                </label>
              </div>
            </div>

            {/* Scheme Criteria Checklist */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Scheme Specific Criteria Checklist
              </h4>
              <div className="space-y-2">
                {scheme.eligibilityCriteria.map((crit) => {
                  const isChecked =
                    userInput.checkedCriteriaIds?.includes(crit.id) ||
                    evaluation.passedCriteria.some((p) => p.id === crit.id);

                  return (
                    <div
                      key={crit.id}
                      onClick={() => toggleCriterion(crit.id)}
                      className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <button type="button" className="mt-0.5 text-emerald-600">
                        {isChecked ? (
                          <CheckSquare className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400" />
                        )}
                      </button>
                      <div className="flex-1 space-y-0.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{crit.label}</span>
                          {crit.isMandatory && (
                            <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.2 rounded">
                              Mandatory
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 leading-relaxed">{crit.description}</p>
                        <div className="text-[11px] text-slate-400 pt-0.5">
                          Verification: {crit.verificationMethod}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: REQUIRED DOCUMENTS CHECKLIST */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            {/* Document Readiness Bar */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Document Readiness Progress:</span>
                <span className="font-extrabold text-emerald-700 text-sm">
                  {evaluation.documentReadinessPercent}% Complete
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${evaluation.documentReadinessPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Check off documents you have in hand. All mandatory documents must be ready in PDF/JPG format before initiating registration.
              </p>
            </div>

            {/* Document Cards */}
            <div className="space-y-3">
              {scheme.requiredDocuments.map((doc) => {
                const isReady = userInput.checkedDocumentIds?.includes(doc.id);

                return (
                  <div
                    key={doc.id}
                    onClick={() => toggleDocument(doc.id)}
                    className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                      isReady
                        ? 'bg-emerald-50/60 border-emerald-300'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <button type="button" className="mt-0.5">
                      {isReady ? (
                        <CheckSquare className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <Square className="h-5 w-5 text-slate-400" />
                      )}
                    </button>

                    <div className="flex-1 space-y-1.5 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="font-bold text-slate-900 text-sm">{doc.documentName}</span>
                        {doc.isMandatory ? (
                          <Badge variant="rose" size="sm">
                            Mandatory for DBT
                          </Badge>
                        ) : (
                          <Badge variant="slate" size="sm">
                            Conditional
                          </Badge>
                        )}
                      </div>

                      <p className="text-slate-600 leading-relaxed">{doc.purpose}</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                        <div className="text-slate-500 bg-white p-2 rounded-lg border border-slate-100">
                          <span className="font-semibold text-slate-700 block">Format & Specs:</span>
                          {doc.specifications}
                        </div>
                        <div className="text-rose-700 bg-rose-50/60 p-2 rounded-lg border border-rose-100">
                          <span className="font-semibold text-rose-800 block">Common Pitfall:</span>
                          {doc.commonPitfalls}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: OFFICIAL APPLICATION ROADMAP */}
        {activeTab === 'roadmap' && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                Official Submission Process
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Step-by-step roadmap to apply on the authorized National Portal without paying third-party agent fees.
              </p>
            </div>

            <div className="space-y-4">
              {scheme.applicationSteps.map((step) => (
                <div
                  key={step.stepNumber}
                  className="p-4 rounded-2xl border border-slate-200 bg-white flex items-start gap-3.5 shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center shrink-0">
                    {step.stepNumber}
                  </div>
                  <div className="space-y-1 text-xs">
                    <h4 className="font-bold text-slate-900 text-sm">{step.title}</h4>
                    <p className="text-slate-600 leading-relaxed">{step.description}</p>
                    <div className="text-[11px] font-semibold text-emerald-700 pt-0.5">
                      Portal Checkpoint: {step.portalAction}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Official Link Button */}
            <div className="bg-gradient-to-r from-forest-900 to-emerald-950 text-white p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                  Authorized Government Website
                </span>
                <p className="text-sm font-bold">Ready to submit your application?</p>
                <p className="text-xs text-slate-300">
                  You will be directed to the official National Portal ({new URL(scheme.officialApplicationUrl).hostname}).
                </p>
              </div>

              <a
                href={scheme.officialApplicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-forest-950 font-bold text-xs shadow-md transition-colors shrink-0"
              >
                <span>Open Authorized Portal</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}

        {/* Modal Legal Disclaimers */}
        <div className="border-t border-slate-200 pt-4 text-[11px] text-slate-500 space-y-1 leading-relaxed">
          <p>
            <strong>Official Policy Disclaimer:</strong> URJA SAATHI is an independent source-backed guidance assistant.
            We do not collect government application fees, submit applications automatically, or guarantee approval.
            Subsidies are sanctioned exclusively through your state DISCOM and central DBT treasury disbursement.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-500">
            {evaluation.readyForOfficialSubmission ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Profile 100% Prepared
              </span>
            ) : (
              <span>Follow checklist steps to prepare documents</span>
            )}
          </div>
          <Button variant="ghost" onClick={onClose}>
            Close Guidance
          </Button>
        </div>
      </div>
    </Modal>
  );
};
