"use client";

import React, { useState } from 'react';
import RecordListLayout from '@/components/hrms/RecordListLayout';
import { useApp } from '@/contexts/AppContext';

export default function RecruitmentPage() {
  const { state } = useApp();
  const [view, setView] = useState<'Jobs' | 'Candidates'>('Jobs');

  const { jobPostings = [], candidates = [] } = state || {};

  return (
    <RecordListLayout
      title="Recruitment"
      subtitle="Manage job postings and candidates"
      actions={
        <button className="px-4 py-2 bg-[#2AB182] text-white text-sm font-medium rounded-lg hover:bg-[#2AB182]/90 transition-colors">
          New Job
        </button>
      }
      filters={
        <div className="flex items-center gap-2 bg-[var(--c-surface-2)] p-1 rounded-lg">
          <button
            onClick={() => setView('Jobs')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              view === 'Jobs'
                ? 'bg-[var(--c-surface)] text-[var(--c-text)] shadow-sm'
                : 'text-[var(--c-text-2)] hover:text-[var(--c-text)]'
            }`}
          >
            Jobs
          </button>
          <button
            onClick={() => setView('Candidates')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              view === 'Candidates'
                ? 'bg-[var(--c-surface)] text-[var(--c-text)] shadow-sm'
                : 'text-[var(--c-text-2)] hover:text-[var(--c-text)]'
            }`}
          >
            Candidates
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {view === 'Jobs' ? (
                    <>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Openings</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Job</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stage</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Applied At</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {view === 'Jobs' ? (
                  jobPostings.length > 0 ? (
                    jobPostings.map((job: any) => (
                      <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{job.title}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{job.department}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{job.openings}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {job.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                        No job postings found.
                      </td>
                    </tr>
                  )
                ) : (
                  candidates.length > 0 ? (
                    candidates.map((candidate: any) => {
                      const job = jobPostings.find((j: any) => j.id === candidate.jobId);
                      return (
                        <tr key={candidate.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{candidate.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{job ? job.title : 'Unknown Job'}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {candidate.stage}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {candidate.appliedAt ? new Date(candidate.appliedAt).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                        No candidates found.
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RecordListLayout>
  );
}
