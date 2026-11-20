import React, { useState } from "react";
import {
  CreditCard,
  Printer,
  Receipt,
  Sparkles,
  Download,
  User,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  Building,
} from "lucide-react";
import confetti from "canvas-confetti";
import { SATYADHI_LOGO } from "../utils/mediaHelper";
import { Button, PageHeader } from "./ui/index.ts";

export default function IdAndFeeReceipt({ activeInstitute }) {
  const [activeTab, setActiveTab] = useState("id-card"); // "id-card" | "receipt"

  // Student Details
  const [studentName, setStudentName] = useState("राहुल वर्मा (Rahul Verma)");
  const [rollNo, setRollNo] = useState("SST-2026-0842");
  const [course, setCourse] = useState("MPPSC Foundation Batch (Pre + Mains)");
  const [batchTime, setBatchTime] = useState("Morning 08:00 AM - 12:00 PM");
  const [phone, setPhone] = useState("+91 98260 12345");
  const [feePaid, setFeePaid] = useState(15000);
  const [totalFee, setTotalFee] = useState(35000);
  const [paymentMode, setPaymentMode] = useState("UPI / PhonePe");

  const balance = totalFee - feePaid;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<CreditCard className="size-6" />}
        title="Student ID Card & Fee Receipt Generator"
        badge="Administration"
        // DN-013: not a GST receipt until the institute confirms GST registration.
        description="नये प्रवेश पर छात्र का बारकोड युक्त स्मार्ट ID Card एवं अधिकृत फीस रसीद जारी करें।"
        actions={
          <Button variant="primary" icon={<Printer className="size-4" />} onClick={handlePrint}>
            {activeTab === "id-card" ? "ID कार्ड प्रिंट करें" : "फीस रसीद प्रिंट करें"}
          </Button>
        }
      />

      {/* Switcher */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab("id-card")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "id-card"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>छात्र ID कार्ड (Identity Card)</span>
        </button>

        <button
          onClick={() => setActiveTab("receipt")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "receipt"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>प्रवेश फीस रसीद (Fee Receipt)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              छात्र प्रवेश विवरण (Admission Info)
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                छात्र का पूरा नाम
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Roll / Reg Number
                </label>
                <input
                  type="text"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Student Mobile
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Course Enrolled
              </label>
              <input
                type="text"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Fee Specific Controls */}
            {activeTab === "receipt" && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Total Course Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={totalFee}
                    onChange={(e) => setTotalFee(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Amount Paid Today (₹)
                  </label>
                  <input
                    type="number"
                    value={feePaid}
                    onChange={(e) => setFeePaid(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Preview */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-900/60 border border-slate-800 min-h-[460px]">
          {/* VIEW 1: STUDENT ID CARD PREVIEW */}
          {activeTab === "id-card" && (
            <div className="w-80 rounded-3xl overflow-hidden shadow-2xl border-2 border-amber-400 bg-slate-950 text-white select-none">
              {/* ID Header */}
              <div className="bg-gradient-to-r from-amber-500 via-orange-600 to-amber-600 p-4 text-center text-slate-950 relative">
                <div className="flex items-center justify-center gap-2">
                  <img
                    src={activeInstitute?.logo || SATYADHI_LOGO}
                    alt="Logo"
                    className="w-10 h-10 rounded-full object-contain bg-amber-300 shadow ring-2 ring-white"
                  />
                  <div className="text-left">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-950">
                      {activeInstitute.name}
                    </h3>
                    <p className="text-[9px] font-bold text-slate-900">
                      {activeInstitute.city} • Student Identity Card
                    </p>
                  </div>
                </div>
              </div>

              {/* ID Body */}
              <div className="p-6 text-center space-y-4 bg-gradient-to-b from-slate-900 to-slate-950">
                {/* Photo Placeholder */}
                <div className="w-24 h-24 mx-auto rounded-2xl bg-slate-800 border-2 border-dashed border-amber-400/60 flex items-center justify-center text-slate-400 shadow-inner">
                  <User className="w-12 h-12 text-slate-500" />
                </div>

                <div>
                  <h4 className="text-base font-bold text-white">
                    {studentName}
                  </h4>
                  <div className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold">
                    {rollNo}
                  </div>
                </div>

                <div className="text-left space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <p>
                    <strong className="text-slate-500">Batch:</strong> {course}
                  </p>
                  <p>
                    <strong className="text-slate-500">Timings:</strong> {batchTime}
                  </p>
                  <p>
                    <strong className="text-slate-500">Validity:</strong> Session 2026-27
                  </p>
                </div>

                {/* Barcode Mockup */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Verified Student</span>
                  </div>
                  <span className="font-mono text-amber-400 font-bold">
                    [BARCODE]
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: FEE RECEIPT PREVIEW */}
          {activeTab === "receipt" && (
            <div className="w-full max-w-lg bg-white text-slate-900 rounded-2xl p-6 md:p-8 shadow-2xl border border-slate-200 select-text">
              {/* Header */}
              <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={activeInstitute?.logo || SATYADHI_LOGO}
                    alt="Logo"
                    className="w-11 h-11 rounded-full object-contain bg-amber-300 ring-2 ring-amber-400 shadow"
                  />
                  <div>
                    <h2 className="text-base font-black uppercase text-slate-950">
                      {activeInstitute.name}
                    </h2>
                    <p className="text-[11px] text-slate-600 font-medium">
                      {activeInstitute.city} • Phone: {activeInstitute.phone}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded">
                    Official Fee Receipt
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Receipt #: REC-2026-0149
                  </p>
                </div>
              </div>

              {/* Student Details */}
              <div className="grid grid-cols-2 gap-2 text-xs py-3 border-b border-slate-200 text-slate-700">
                <div>
                  <strong>Student Name:</strong> {studentName}
                </div>
                <div>
                  <strong>Roll No:</strong> {rollNo}
                </div>
                <div>
                  <strong>Course:</strong> {course}
                </div>
                <div>
                  <strong>Date:</strong> 18 Nov 2026
                </div>
              </div>

              {/* Fee Breakdown Table */}
              <div className="py-4 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200 font-semibold text-slate-600">
                  <span>Fee Particulars</span>
                  <span>Amount (INR)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Tuition & Digital Classroom Access Fee</span>
                  <span>₹{totalFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 text-emerald-700 font-bold bg-emerald-50 px-2 rounded">
                  <span>Amount Received Today ({paymentMode})</span>
                  <span>₹{feePaid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 text-rose-700 font-semibold px-2">
                  <span>Remaining Balance Due</span>
                  <span>₹{balance.toLocaleString()}</span>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-6 border-t border-slate-300 flex items-center justify-between text-xs text-slate-600">
                <div>Student Signature</div>
                <div className="text-right">
                  <div className="font-bold border-t border-slate-400 pt-1">
                    Authorized Cashier / Accounts
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {activeInstitute.name}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
