"use client";

import React, { useState } from "react";
import RecordListLayout from "@/components/hrms/RecordListLayout";
import { useApp } from "@/contexts/AppContext";

export default function TimesheetsPage() {
  const { state } = useApp();
  const [filterStatus, setFilterStatus] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const timesheets = state.timesheets || [];
  const teamMembers = state.teamMembers || [];

  const getEmployeeName = (userId: string) => {
    const member = teamMembers.find((m: any) => m.id === userId || m.userId === userId);
    if (member) {
      return member.name || "Unknown Employee";
    }
    return "Unknown Employee";
  };

  const filteredTimesheets = timesheets.filter((t: any) => {
    if (filterStatus === "All") return true;
    return t.status?.toLowerCase() === filterStatus.toLowerCase();
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "#2AB182";
      case "submitted":
        return "#F59E0B";
      case "draft":
      default:
        return "#6B7280";
    }
  };

  return (
    <RecordListLayout
      title="Timesheets"
      subtitle="Manage and review employee timesheets"
      actions={
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            backgroundColor: "#2AB182",
            color: "#FFFFFF",
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "14px",
          }}
        >
          Submit Timesheet
        </button>
      }
    >
      {/* Filter Bar */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "24px",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "14px", color: "var(--c-text-secondary, #6B7280)" }}>
          Filter by Status:
        </span>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid var(--c-border)",
            backgroundColor: "var(--c-surface)",
            color: "var(--c-text, inherit)",
            fontSize: "14px",
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="All">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      {/* Table */}
      <div
        style={{
          backgroundColor: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--c-border)",
                  backgroundColor: "var(--c-bg)",
                }}
              >
                <th style={{ padding: "12px 16px", fontWeight: 500, fontSize: "14px" }}>Employee</th>
                <th style={{ padding: "12px 16px", fontWeight: 500, fontSize: "14px" }}>Period</th>
                <th style={{ padding: "12px 16px", fontWeight: 500, fontSize: "14px" }}>Total Hours</th>
                <th style={{ padding: "12px 16px", fontWeight: 500, fontSize: "14px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTimesheets.length > 0 ? (
                filteredTimesheets.map((sheet: any) => (
                  <tr
                    key={sheet.id}
                    style={{
                      borderBottom: "1px solid var(--c-border)",
                    }}
                  >
                    <td style={{ padding: "12px 16px", fontSize: "14px" }}>
                      {getEmployeeName(sheet.userId)}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "14px" }}>
                      {sheet.startDate} - {sheet.endDate}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "14px" }}>
                      {sheet.totalHours}h
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "14px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 8px",
                          borderRadius: "9999px",
                          fontSize: "12px",
                          fontWeight: 500,
                          backgroundColor: `${getStatusColor(sheet.status)}1A`,
                          color: getStatusColor(sheet.status),
                          textTransform: "capitalize",
                        }}
                      >
                        {sheet.status || "draft"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ padding: "32px", textAlign: "center", color: "#6B7280" }}>
                    No timesheets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simple Modal */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: "var(--c-surface)",
              padding: "24px",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "400px",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
              border: "1px solid var(--c-border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: 600 }}>
              Submit Timesheet
            </h3>
            <p style={{ margin: "0 0 24px 0", color: "var(--c-text-secondary, #6B7280)", fontSize: "14px" }}>
              Please fill out the details for your new timesheet.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "1px solid var(--c-border)",
                  backgroundColor: "transparent",
                  color: "var(--c-text, inherit)",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: "#2AB182",
                  color: "#FFFFFF",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </RecordListLayout>
  );
}
