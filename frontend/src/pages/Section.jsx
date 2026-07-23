import { useState, useEffect } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import { DataCard, DataGrid, StatusBadge, statusTone, EmptyRow, SectionToolbar } from "../components/DataCard";
import { useAuth } from "../contexts/AuthContext.jsx";
import { downloadPrescriptionPdf } from "../utils/generatePrescriptionPdf";
import {
  appointmentService,
  queueService,
  pharmacyService,
  queryService,
  departmentService,
  staffService,
  leaveService,
  analyticsService,
} from "../services/api.js";

const STAFF_ROLES = ["doctor", "nurse", "accountant", "receptionist", "pharmacist"];
const EMPTY_STAFF_FORM = {
  name: "",
  role: "nurse",
  contactNumber: "",
  email: "",
  designation: "",
  degree: "",
  registrationNo: "",
  departmentId: "",
  consultationFee: "",
  dateOfBirth: "",
  gender: "",
  bloodGroup: "",
  address: "",
  emergencyContactName: "",
  emergencyContactNumber: "",
  qualification: "",
  experienceYears: "",
  joiningDate: "",
  shiftTiming: "",
  employeeIdProof: "",
  salary: "",
};

const EMPTY_MEDICINE_LINE = { name: "", dosage: "", quantity: "" };

export default function Section() {
  const { section } = useParams();
  const config = useOutletContext();
  const { user } = useAuth();
  const current = config.sections.find((s) => s.path === section) ?? config.sections[0];
  // The real logged-in role (nurse / accountant / receptionist / doctor / pharmacist / admin / patient),
  // as opposed to config.role which is "staff" for the shared nurse/accountant/receptionist portal.
  const actualRole = user?.role || config.role;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [bookingStatus, setBookingStatus] = useState("");

  // --- Admin-only state ---
  const [staffList, setStaffList] = useState([]);
  const [staffRoleFilter, setStaffRoleFilter] = useState("");
  const [newStaffResult, setNewStaffResult] = useState(null);
  const [staffForm, setStaffForm] = useState(EMPTY_STAFF_FORM);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [assignDoctorChoice, setAssignDoctorChoice] = useState({});
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [actionMessage, setActionMessage] = useState("");

  // --- Doctor-only state ---
  const [rxAppointmentId, setRxAppointmentId] = useState(null);
  const [rxMedicines, setRxMedicines] = useState([{ ...EMPTY_MEDICINE_LINE }]);
  const [rxStatus, setRxStatus] = useState("");

  // --- Staff (nurse / accountant / receptionist) state ---
  const [leaveForm, setLeaveForm] = useState({ fromDate: "", toDate: "", reason: "" });
  const [leaveApplyStatus, setLeaveApplyStatus] = useState("");
  const [replyDrafts, setReplyDrafts] = useState({});
  const [apptLookupValue, setApptLookupValue] = useState("");
  const [apptLookupResult, setApptLookupResult] = useState(null);
  const [apptLookupSearched, setApptLookupSearched] = useState(false);
  const [apptLookupError, setApptLookupError] = useState("");

  // --- Shared profile state (doctor + staff) ---
  const [profileData, setProfileData] = useState(null);
  const [profileForm, setProfileForm] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  // --- Pharmacist-only state ---
  const [lookupType, setLookupType] = useState("appointment");
  const [lookupValue, setLookupValue] = useState("");
  const [lookupResults, setLookupResults] = useState(null);
  const [lookupSearched, setLookupSearched] = useState(false);
  const [medicineDrafts, setMedicineDrafts] = useState({});
  const [addMedicineForm, setAddMedicineForm] = useState({
    name: "",
    quantity: "",
    unit: "tablets",
    price: "",
    expiryDate: "",
  });

  useEffect(() => {
    setError("");
    setPayload(null);
    setActionMessage("");
    setRxAppointmentId(null);
    setRxMedicines([{ ...EMPTY_MEDICINE_LINE }]);
    setRxStatus("");
    setLeaveApplyStatus("");
    setProfileMessage("");
    setLookupResults(null);
    setLookupSearched(false);
    setApptLookupResult(null);
    setApptLookupSearched(false);
    setApptLookupError("");
    setLoading(true);

    const fetchData = async () => {
      try {
        if (config.role === "patient") {
          if (section === "appointments") {
            const response = await appointmentService.getMyAppointments();
            setPayload(response.data);
          } else if (section === "queue") {
            const response = await queueService.getMyToken();
            setPayload(response.data);
          } else if (section === "prescriptions") {
            const response = await pharmacyService.getMyPrescriptions();
            setPayload(response.data);
          } else if (section === "queries") {
            const response = await queryService.getMine();
            setPayload(response.data);
          } else if (section === "book") {
            const deptResponse = await departmentService.getAll();
            setDepartments(deptResponse.data || []);
          }
        } else if (config.role === "admin") {
          if (section === "staff") {
            const response = await staffService.getStaff(staffRoleFilter || undefined);
            setStaffList(response.data || []);
          } else if (section === "add-staff") {
            const deptResponse = await departmentService.getAll();
            setDepartments(deptResponse.data || []);
          } else if (section === "departments") {
            const [deptResponse, doctorResponse] = await Promise.all([
              departmentService.getAll(),
              staffService.getStaff("doctor"),
            ]);
            setDepartments(deptResponse.data || []);
            setDoctors(doctorResponse.data || []);
          } else if (section === "leave-requests") {
            const response = await leaveService.getPending();
            setLeaveRequests(response.data || []);
          } else if (section === "appointments") {
            const response = await appointmentService.getAllAppointments();
            setAllAppointments(response.data || []);
          } else if (section === "analytics") {
            const response = await analyticsService.getOverview();
            setAnalytics(response.data);
          }
        } else if (config.role === "doctor") {
          if (section === "appointments") {
            const response = await appointmentService.getMyAppointments();
            setPayload(response.data);
          } else if (section === "prescriptions") {
            const response = await pharmacyService.getPrescriptions({ doctorId: user?._id });
            setPayload(response.data);
          } else if (section === "profile") {
            const response = await staffService.getMyProfile();
            setProfileData(response.data);
          }
        } else if (config.role === "staff") {
          if (section === "leave-history") {
            const response = await leaveService.getMine();
            setPayload(response.data);
          } else if (section === "queries") {
            if (actualRole === "receptionist") {
              const [queryResponse, doctorResponse] = await Promise.all([
                queryService.getOpen(),
                staffService.getDoctors(),
              ]);
              setPayload(queryResponse.data);
              setDoctors(doctorResponse.data || []);
            }
          } else if (section === "profile") {
            const response = await staffService.getMyProfile();
            setProfileData(response.data);
          }
        } else if (config.role === "pharmacist") {
          if (section === "inventory") {
            const response = await pharmacyService.getMedicines();
            setPayload(response.data);
          }
        }
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load section data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [config.role, section, staffRoleFilter, actualRole]);

  useEffect(() => {
    const fetchDoctors = async () => {
      if (!selectedDepartment) {
        setDoctors([]);
        return;
      }
      try {
        const response = await staffService.getDoctors(selectedDepartment);
        setDoctors(response.data || []);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load doctors");
      }
    };

    if (config.role === "patient") {
      fetchDoctors();
    }
  }, [selectedDepartment, config.role]);

  useEffect(() => {
    if (profileData) {
      setProfileForm({
        contactNumber: profileData.contactNumber || "",
        email: profileData.email || "",
        address: profileData.address || "",
        emergencyContactName: profileData.emergencyContactName || "",
        emergencyContactNumber: profileData.emergencyContactNumber || "",
        bloodGroup: profileData.bloodGroup || "",
      });
    }
  }, [profileData]);

  const fetchSlots = async () => {
    if (!selectedDoctor || !selectedDate) {
      setError("Select a doctor and date to see available slots.");
      return;
    }

    try {
      setError("");
      setLoading(true);
      const response = await appointmentService.getAvailableSlots(selectedDoctor, selectedDate);
      setSlots(response.data || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load available slots");
    } finally {
      setLoading(false);
    }
  };

  const bookAppointment = async (slotTime) => {
    try {
      setError("");
      setBookingStatus("Booking appointment...");
      const response = await appointmentService.bookAppointment({
        doctorId: selectedDoctor,
        departmentId: selectedDepartment,
        slotTime,
      });
      const code = response.data?.appointment?.appointmentCode;
      setBookingStatus(code ? `Appointment booked. Your appointment ID is ${code} — keep it handy for pharmacy pickup and check-in.` : "Appointment booked successfully.");
      setSlots((prev) => prev.filter((slot) => slot.time !== slotTime));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to book appointment");
      setBookingStatus("");
    }
  };

  // --- Admin actions ---

  const handleStaffFormChange = (field, value) => {
    setStaffForm((prev) => ({ ...prev, [field]: value }));
  };

  const submitAddStaff = async (e) => {
    e.preventDefault();
    if (!staffForm.name || !staffForm.role) {
      setError("Name and role are required.");
      return;
    }
    if (!staffForm.contactNumber) {
      setError("Contact number is required (it's used to generate the username).");
      return;
    }
    try {
      setError("");
      setLoading(true);
      const body = {
        name: staffForm.name,
        role: staffForm.role,
        contactNumber: staffForm.contactNumber,
        email: staffForm.email || undefined,
        dateOfBirth: staffForm.dateOfBirth || undefined,
        gender: staffForm.gender || undefined,
        bloodGroup: staffForm.bloodGroup || undefined,
        address: staffForm.address || undefined,
        emergencyContactName: staffForm.emergencyContactName || undefined,
        emergencyContactNumber: staffForm.emergencyContactNumber || undefined,
        qualification: staffForm.qualification || undefined,
        experienceYears: staffForm.experienceYears || undefined,
        joiningDate: staffForm.joiningDate || undefined,
        shiftTiming: staffForm.shiftTiming || undefined,
        employeeIdProof: staffForm.employeeIdProof || undefined,
        salary: staffForm.salary || undefined,
      };
      if (staffForm.role === "doctor") {
        body.designation = staffForm.designation || undefined;
        body.degree = staffForm.degree || undefined;
        body.registrationNo = staffForm.registrationNo || undefined;
        body.departmentId = staffForm.departmentId || undefined;
        body.consultationFee = staffForm.consultationFee ? Number(staffForm.consultationFee) : undefined;
      }
      const response = await staffService.addStaff(body);
      setNewStaffResult(response.data);
      setStaffForm(EMPTY_STAFF_FORM);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add staff member");
    } finally {
      setLoading(false);
    }
  };

  const deactivateStaff = async (id) => {
    try {
      setError("");
      await staffService.deleteStaff(id);
      setStaffList((prev) => prev.filter((s) => s._id !== id));
      setActionMessage("Staff member deactivated.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to deactivate staff member");
    }
  };

  const createDepartment = async (e) => {
    e.preventDefault();
    if (!newDepartmentName.trim()) return;
    try {
      setError("");
      const response = await departmentService.create(newDepartmentName.trim());
      setDepartments((prev) => [...prev, response.data.department]);
      setNewDepartmentName("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create department");
    }
  };

  const assignDoctor = async (departmentId) => {
    const doctorId = assignDoctorChoice[departmentId];
    if (!doctorId) return;
    try {
      setError("");
      const response = await departmentService.assignDoctor(departmentId, doctorId);
      setDepartments((prev) =>
        prev.map((d) => (d._id === departmentId ? response.data.department : d))
      );
    } catch (err) {
      setError(err.response?.data?.error || "Failed to assign doctor");
    }
  };

  const removeDoctor = async (departmentId, doctorId) => {
    try {
      setError("");
      const response = await departmentService.removeDoctor(departmentId, doctorId);
      setDepartments((prev) =>
        prev.map((d) => (d._id === departmentId ? response.data.department : d))
      );
    } catch (err) {
      setError(err.response?.data?.error || "Failed to remove doctor");
    }
  };

  const reviewLeave = async (id, decision) => {
    try {
      setError("");
      if (decision === "approve") {
        await leaveService.approve(id);
      } else {
        await leaveService.reject(id);
      }
      setLeaveRequests((prev) => prev.filter((l) => l._id !== id));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update leave request");
    }
  };

  const updateAppointmentStatusAdmin = async (id, status) => {
    try {
      setError("");
      const response = await appointmentService.updateStatus(id, status);
      setAllAppointments((prev) =>
        prev.map((a) => (a._id === id ? response.data.appointment : a))
      );
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update appointment");
    }
  };

  const cancelAppointmentAdmin = async (id) => {
    try {
      setError("");
      await appointmentService.cancel(id);
      setAllAppointments((prev) =>
        prev.map((a) => (a._id === id ? { ...a, status: "cancelled" } : a))
      );
    } catch (err) {
      setError(err.response?.data?.error || "Failed to cancel appointment");
    }
  };

  // --- Doctor actions ---

  const updateDoctorAppointmentStatus = async (id, status) => {
    try {
      setError("");
      const response = await appointmentService.updateStatus(id, status);
      setPayload((prev) => prev.map((a) => (a._id === id ? response.data.appointment : a)));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update appointment");
    }
  };

  const updateRxMedicineLine = (index, field, value) => {
    setRxMedicines((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  };

  const addRxMedicineLine = () => {
    setRxMedicines((prev) => [...prev, { ...EMPTY_MEDICINE_LINE }]);
  };

  const removeRxMedicineLine = (index) => {
    setRxMedicines((prev) => prev.filter((_, i) => i !== index));
  };

  const submitPrescription = async (appt) => {
    const validLines = rxMedicines.filter((m) => m.name.trim());
    if (validLines.length === 0) {
      setRxStatus("Add at least one medicine.");
      return;
    }
    try {
      setRxStatus("Saving prescription...");
      await pharmacyService.createPrescription({
        appointmentId: appt._id,
        patientId: appt.patientId?._id,
        medicines: validLines.map((m) => ({
          name: m.name,
          dosage: m.dosage,
          quantity: m.quantity ? Number(m.quantity) : undefined,
        })),
      });
      setRxStatus("Prescription saved.");
      setRxMedicines([{ ...EMPTY_MEDICINE_LINE }]);
      setRxAppointmentId(null);
    } catch (err) {
      setRxStatus(err.response?.data?.error || "Failed to save prescription");
    }
  };

  // --- Staff (nurse / accountant / receptionist) actions ---

  const submitLeaveApplication = async (e) => {
    e.preventDefault();
    if (!leaveForm.fromDate || !leaveForm.toDate || !leaveForm.reason) {
      setLeaveApplyStatus("From date, to date, and reason are required.");
      return;
    }
    try {
      setLeaveApplyStatus("Submitting...");
      await leaveService.apply(leaveForm.fromDate, leaveForm.toDate, leaveForm.reason);
      setLeaveApplyStatus("Leave request submitted.");
      setLeaveForm({ fromDate: "", toDate: "", reason: "" });
    } catch (err) {
      setLeaveApplyStatus(err.response?.data?.error || "Failed to submit leave request");
    }
  };

  const submitQueryReply = async (id) => {
    const draft = replyDrafts[id] || {};
    if (!draft.reply?.trim()) return;
    try {
      setError("");
      const response = await queryService.reply(id, draft.reply, draft.assignedDoctorId || undefined);
      setPayload((prev) => prev.map((q) => (q._id === id ? response.data.query : q)));
      setReplyDrafts((prev) => ({ ...prev, [id]: { reply: "", assignedDoctorId: "" } }));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send reply");
    }
  };

  const closeQuery = async (id) => {
    try {
      setError("");
      const response = await queryService.close(id);
      setPayload((prev) => prev.map((q) => (q._id === id ? response.data.query : q)));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to close query");
    }
  };

  const runAppointmentLookup = async (e) => {
    e.preventDefault();
    if (!apptLookupValue.trim()) return;
    try {
      setApptLookupError("");
      setApptLookupSearched(true);
      const response = await appointmentService.getByCode(apptLookupValue.trim());
      setApptLookupResult(response.data);
    } catch (err) {
      setApptLookupResult(null);
      setApptLookupError(err.response?.data?.error || "No appointment found for that code");
    }
  };

  const updateApptLookupStatus = async (status) => {
    if (!apptLookupResult) return;
    try {
      setApptLookupError("");
      const response = await appointmentService.updateStatus(apptLookupResult._id, status);
      setApptLookupResult(response.data.appointment);
    } catch (err) {
      setApptLookupError(err.response?.data?.error || "Failed to update appointment");
    }
  };

  // --- Shared profile actions ---

  const submitProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      setProfileSaving(true);
      setProfileMessage("");
      const response = await staffService.updateMyProfile(profileForm);
      setProfileData(response.data.staff);
      setProfileMessage("Profile updated.");
    } catch (err) {
      setProfileMessage(err.response?.data?.error || "Failed to update profile");
    } finally {
      setProfileSaving(false);
    }
  };

  // --- Pharmacist actions ---

  const runLookup = async (e) => {
    e.preventDefault();
    if (!lookupValue.trim()) return;
    try {
      setError("");
      setLoading(true);
      setLookupSearched(true);
      const params = lookupType === "appointment" ? { appointmentCode: lookupValue.trim() } : { patientName: lookupValue.trim() };
      const response = await pharmacyService.getPrescriptions(params);
      setLookupResults(response.data || []);
    } catch (err) {
      setError(err.response?.data?.error || "Lookup failed");
      setLookupResults([]);
    } finally {
      setLoading(false);
    }
  };

  const updateLookupMedicineAvailability = async (prescriptionId, medicineIndex, availability) => {
    try {
      setError("");
      const response = await pharmacyService.updateMedicineAvailability(prescriptionId, medicineIndex, availability);
      setLookupResults((prev) =>
        prev.map((p) => (p._id === prescriptionId ? response.data.prescription : p))
      );
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update availability");
    }
  };

  const getMedicineDraft = (med) =>
    medicineDrafts[med._id] || {
      quantity: med.quantity,
      price: med.price,
      expiryDate: med.expiryDate ? med.expiryDate.slice(0, 10) : "",
      isAvailable: med.isAvailable,
    };

  const setMedicineDraft = (id, field, value) => {
    setMedicineDrafts((prev) => ({
      ...prev,
      [id]: { ...getMedicineDraft({ _id: id, ...(payload?.find((m) => m._id === id) || {}) }), ...prev[id], [field]: value },
    }));
  };

  const saveMedicine = async (med) => {
    const draft = getMedicineDraft(med);
    try {
      setError("");
      const response = await pharmacyService.updateMedicine(med._id, {
        quantity: draft.quantity !== "" ? Number(draft.quantity) : undefined,
        price: draft.price !== "" ? Number(draft.price) : undefined,
        expiryDate: draft.expiryDate || undefined,
        isAvailable: draft.isAvailable,
      });
      setPayload((prev) => prev.map((m) => (m._id === med._id ? response.data.medicine : m)));
      setActionMessage("Medicine updated.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update medicine");
    }
  };

  const deleteMedicineRow = async (id) => {
    try {
      setError("");
      await pharmacyService.deleteMedicine(id);
      setPayload((prev) => prev.filter((m) => m._id !== id));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete medicine");
    }
  };

  const submitAddMedicine = async (e) => {
    e.preventDefault();
    if (!addMedicineForm.name || !addMedicineForm.quantity || !addMedicineForm.price) {
      setError("Name, quantity, and price are required.");
      return;
    }
    try {
      setError("");
      setLoading(true);
      await pharmacyService.addMedicine({
        name: addMedicineForm.name,
        quantity: Number(addMedicineForm.quantity),
        unit: addMedicineForm.unit,
        price: Number(addMedicineForm.price),
        expiryDate: addMedicineForm.expiryDate || undefined,
      });
      setActionMessage(`${addMedicineForm.name} added to inventory.`);
      setAddMedicineForm({ name: "", quantity: "", unit: "tablets", price: "", expiryDate: "" });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add medicine");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------
  // Renderers
  // ---------------------------------------------------------------------

  const renderPatientContent = () => {
    if (loading) {
      return <div className="text-gray-600">Loading...</div>;
    }

    if (error) {
      return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
    }

    if (section === "appointments") {
      if (!payload || payload.length === 0) {
        return <EmptyRow>No appointments found. Book one from the Book Appointment tab.</EmptyRow>;
      }

      return (
        <div className="space-y-4">
          <div className="text-sm text-slate-soft">{payload.length} appointment{payload.length !== 1 ? "s" : ""}</div>
          {payload.map((appt) => (
            <DataCard
              key={appt._id}
              title={appt.doctorId?.name || "Unknown doctor"}
              subtitle={appt.appointmentCode}
              badge={<StatusBadge status={appt.status} tone={statusTone(appt.status)} />}
            >
              <DataGrid
                fields={[
                  { label: "Appointment ID", value: appt.appointmentCode || "—" },
                  { label: "Slot", value: new Date(appt.slotTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) },
                  { label: "Department", value: appt.department?.name },
                  { label: "Doctor", value: appt.doctorId?.name },
                ]}
              />
            </DataCard>
          ))}
        </div>
      );
    }

    if (section === "queue") {
      if (!payload) {
        return <EmptyRow>You are not currently in a queue. Join one through the Book Appointment tab.</EmptyRow>;
      }

      return (
        <div className="rounded-2xl border border-mist bg-white p-8 shadow-sm max-w-md">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Your current token</div>
          <div className="mt-3 text-5xl font-display font-semibold text-navy">{payload.token || "—"}</div>
          <div className="mt-6 pt-6 border-t border-mist">
            <DataGrid
              fields={[
                { label: "Department", value: payload.department?.name || "N/A" },
                { label: "Status", value: <StatusBadge status={payload.status || "Waiting"} tone={statusTone(payload.status)} /> },
              ]}
            />
          </div>
        </div>
      );
    }

    if (section === "prescriptions") {
      if (!payload || payload.length === 0) {
        return <EmptyRow>No prescriptions available yet. They will appear here after a doctor visit.</EmptyRow>;
      }

      return (
        <div className="space-y-4">
          <div className="text-sm text-slate-soft">{payload.length} prescription{payload.length !== 1 ? "s" : ""}</div>
          {payload.map((prescription) => (
            <DataCard
              key={prescription._id}
              title={prescription.doctorId?.name || "Unknown doctor"}
              subtitle={`Issued ${new Date(prescription.createdAt).toLocaleDateString([], { dateStyle: "medium" })}`}
              actions={
                <button
                  onClick={() => downloadPrescriptionPdf(prescription, user)}
                  className="inline-flex items-center gap-2 rounded-full border border-navy/15 bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy-light transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download PDF
                </button>
              }
            >
              <div className="space-y-2.5">
                {prescription.medicines?.map((med, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-xl bg-mist px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-ink text-sm truncate">{med.name}</div>
                      <div className="text-xs text-slate-soft mt-0.5">
                        {med.dosage || "Follow doctor's instructions"}{med.quantity ? ` · qty ${med.quantity}` : ""}
                      </div>
                    </div>
                    <StatusBadge status={med.availability || "pending"} tone={statusTone(med.availability)} />
                  </div>
                ))}
              </div>
            </DataCard>
          ))}
        </div>
      );
    }

    if (section === "queries") {
      if (!payload || payload.length === 0) {
        return <EmptyRow>You have no open queries. Send one through reception if needed.</EmptyRow>;
      }

      return (
        <div className="space-y-4">
          {payload.map((query) => (
            <DataCard
              key={query._id}
              title={query.subject}
              badge={<StatusBadge status={query.status} tone={statusTone(query.status)} />}
            >
              <p className="text-sm text-slate-600 leading-relaxed">{query.message}</p>
              {query.reply && (
                <div className="mt-4 rounded-xl bg-navy p-4 text-sm text-white">
                  <div className="font-semibold text-xs uppercase tracking-wide text-white/70">Reply from staff</div>
                  <div className="mt-2 text-slate-100 leading-relaxed">{query.reply}</div>
                </div>
              )}
            </DataCard>
          ))}
        </div>
      );
    }

    if (section === "book") {
      return (
        <div className="space-y-6">
          <DataCard title="Find a slot">
            <div className="grid gap-5 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Department</span>
                <select
                  value={selectedDepartment}
                  onChange={(e) => {
                    setSelectedDepartment(e.target.value);
                    setSelectedDoctor("");
                    setSlots([]);
                    setBookingStatus("");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                >
                  <option value="">Select department</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>{dept.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Doctor</span>
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  disabled={!doctors.length}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm disabled:bg-mist disabled:text-slate-400 focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                >
                  <option value="">Select doctor</option>
                  {doctors.map((doc) => (
                    <option key={doc._id} value={doc._id}>{doc.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Visit date</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-4 pt-5 border-t border-mist">
              <button
                type="button"
                onClick={fetchSlots}
                disabled={!selectedDepartment || !selectedDoctor || !selectedDate}
                className="rounded-full bg-crimson px-6 py-2.5 text-sm font-semibold text-white hover:bg-crimson-dark disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
              >
                Find available slots
              </button>
              {bookingStatus && <div className="text-sm font-medium text-emerald-600">{bookingStatus}</div>}
            </div>
          </DataCard>

          {slots.length > 0 ? (
            <div>
              <div className="text-sm text-slate-soft mb-3">{slots.length} slot{slots.length !== 1 ? "s" : ""} available</div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => bookAppointment(slot.time)}
                    className="rounded-xl border border-mist bg-white p-4 text-left hover:border-crimson/40 hover:shadow-md transition-all duration-150"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-soft/80">Available slot</div>
                    <div className="mt-1.5 text-lg font-semibold text-ink">{new Date(slot.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            selectedDoctor && selectedDate && !loading && (
              <EmptyRow>No slots available for the selected doctor and date.</EmptyRow>
            )
          )}
        </div>
      );
    }

    return (
      <EmptyState
        title={current.label}
        description={current.desc}
        accent={config.accent === "crimson" ? "crimson" : "navy"}
      />
    );
  };

  const renderAdminContent = () => {
    if (section === "staff") {
      return (
        <div className="space-y-6">
          <SectionToolbar>
            <label className="flex items-center gap-3 text-sm text-slate-600">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Filter by role</span>
              <select
                value={staffRoleFilter}
                onChange={(e) => setStaffRoleFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
              >
                <option value="">All roles</option>
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </label>
            {actionMessage && <div className="text-sm font-medium text-emerald-600">{actionMessage}</div>}
          </SectionToolbar>

          {loading ? (
            <div className="text-gray-600">Loading...</div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
          ) : staffList.length === 0 ? (
            <EmptyRow>No staff members found. Add one from the Add staff tab.</EmptyRow>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-slate-soft">{staffList.length} staff member{staffList.length !== 1 ? "s" : ""}</div>
              {staffList.map((s) => (
                <DataCard
                  key={s._id}
                  title={s.name}
                  subtitle={`@${s.username}`}
                  badge={<StatusBadge status={s.role} tone="info" />}
                  actions={
                    <button
                      onClick={() => deactivateStaff(s._id)}
                      className="rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
                    >
                      Deactivate
                    </button>
                  }
                >
                  <DataGrid
                    fields={[
                      { label: "Department", value: s.department?.name || "—" },
                      { label: "Contact", value: s.contactNumber || s.email || "—" },
                      { label: "Shift", value: s.shiftTiming ? s.shiftTiming.charAt(0).toUpperCase() + s.shiftTiming.slice(1) : "—" },
                      { label: "Joined", value: s.joiningDate ? new Date(s.joiningDate).toLocaleDateString() : "—" },
                    ]}
                  />
                </DataCard>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (section === "add-staff") {
      return (
        <div className="max-w-3xl space-y-6">
          {newStaffResult && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-800">
              <div className="font-semibold">Staff member added successfully</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div><span className="text-emerald-600">Username:</span> <strong>{newStaffResult.user.username}</strong></div>
                <div><span className="text-emerald-600">Temp password:</span> <strong>{newStaffResult.user.tempPassword}</strong></div>
              </div>
              <div className="mt-3 text-xs text-emerald-700">{newStaffResult.warning}</div>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={submitAddStaff} className="space-y-6 rounded-2xl border border-mist bg-white p-6 shadow-sm">
            <div>
              <div className="text-sm font-semibold text-ink mb-3">Basic details</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Full name *</span>
                  <input
                    type="text"
                    value={staffForm.name}
                    onChange={(e) => handleStaffFormChange("name", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    required
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Role *</span>
                  <select
                    value={staffForm.role}
                    onChange={(e) => handleStaffFormChange("role", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    {STAFF_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Contact number * <span className="text-slate-400">(used to generate username)</span></span>
                  <input
                    type="text"
                    value={staffForm.contactNumber}
                    onChange={(e) => handleStaffFormChange("contactNumber", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    placeholder="e.g. +91-9876543210"
                    required
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Email</span>
                  <input
                    type="email"
                    value={staffForm.email}
                    onChange={(e) => handleStaffFormChange("email", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Date of birth</span>
                  <input
                    type="date"
                    value={staffForm.dateOfBirth}
                    onChange={(e) => handleStaffFormChange("dateOfBirth", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Gender</span>
                  <select
                    value={staffForm.gender}
                    onChange={(e) => handleStaffFormChange("gender", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Blood group</span>
                  <input
                    type="text"
                    value={staffForm.bloodGroup}
                    onChange={(e) => handleStaffFormChange("bloodGroup", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    placeholder="e.g. O+"
                  />
                </label>
                <label className="space-y-2 sm:col-span-2">
                  <span className="text-sm text-slate-600">Address</span>
                  <input
                    type="text"
                    value={staffForm.address}
                    onChange={(e) => handleStaffFormChange("address", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />
                </label>
              </div>
            </div>

            <div className="border-t border-mist pt-4">
              <div className="text-sm font-semibold text-ink mb-3">Emergency contact</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Name</span>
                  <input
                    type="text"
                    value={staffForm.emergencyContactName}
                    onChange={(e) => handleStaffFormChange("emergencyContactName", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Number</span>
                  <input
                    type="text"
                    value={staffForm.emergencyContactNumber}
                    onChange={(e) => handleStaffFormChange("emergencyContactNumber", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />
                </label>
              </div>
            </div>

            <div className="border-t border-mist pt-4">
              <div className="text-sm font-semibold text-ink mb-3">Employment details</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Qualification</span>
                  <input
                    type="text"
                    value={staffForm.qualification}
                    onChange={(e) => handleStaffFormChange("qualification", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    placeholder="e.g. B.Sc Nursing"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Experience (years)</span>
                  <input
                    type="number"
                    min="0"
                    value={staffForm.experienceYears}
                    onChange={(e) => handleStaffFormChange("experienceYears", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Joining date</span>
                  <input
                    type="date"
                    value={staffForm.joiningDate}
                    onChange={(e) => handleStaffFormChange("joiningDate", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Shift timing</span>
                  <select
                    value={staffForm.shiftTiming}
                    onChange={(e) => handleStaffFormChange("shiftTiming", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <option value="">Select</option>
                    <option value="morning">Morning</option>
                    <option value="evening">Evening</option>
                    <option value="night">Night</option>
                    <option value="rotational">Rotational</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Government ID / proof number</span>
                  <input
                    type="text"
                    value={staffForm.employeeIdProof}
                    onChange={(e) => handleStaffFormChange("employeeIdProof", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    placeholder="e.g. Aadhar number"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Monthly salary</span>
                  <input
                    type="number"
                    min="0"
                    value={staffForm.salary}
                    onChange={(e) => handleStaffFormChange("salary", e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />
                </label>
              </div>
            </div>

            {staffForm.role === "doctor" && (
              <div className="border-t border-mist pt-4">
                <div className="text-sm font-semibold text-ink mb-3">Doctor-specific details</div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm text-slate-600">Designation</span>
                    <input
                      type="text"
                      value={staffForm.designation}
                      onChange={(e) => handleStaffFormChange("designation", e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-600">Degree</span>
                    <input
                      type="text"
                      value={staffForm.degree}
                      onChange={(e) => handleStaffFormChange("degree", e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-600">Registration number</span>
                    <input
                      type="text"
                      value={staffForm.registrationNo}
                      onChange={(e) => handleStaffFormChange("registrationNo", e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-600">Department</span>
                    <select
                      value={staffForm.departmentId}
                      onChange={(e) => handleStaffFormChange("departmentId", e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    >
                      <option value="">Select department</option>
                      {departments.map((dept) => (
                        <option key={dept._id} value={dept._id}>{dept.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-600">Consultation fee</span>
                    <input
                      type="number"
                      value={staffForm.consultationFee}
                      onChange={(e) => handleStaffFormChange("consultationFee", e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    />
                  </label>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Adding..." : "Add staff member"}
            </button>
          </form>
        </div>
      );
    }

    if (section === "departments") {
      return (
        <div className="space-y-6">
          <form onSubmit={createDepartment} className="flex flex-wrap items-end gap-3">
            <label className="space-y-2">
              <span className="text-sm text-slate-600">New department name</span>
              <input
                type="text"
                value={newDepartmentName}
                onChange={(e) => setNewDepartmentName(e.target.value)}
                className="w-64 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                placeholder="e.g. Orthopedics"
              />
            </label>
            <button
              type="submit"
              className="rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-light"
            >
              Create department
            </button>
          </form>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
          )}

          {loading ? (
            <div className="text-gray-600">Loading...</div>
          ) : departments.length === 0 ? (
            <p className="text-gray-600">No departments yet. Create one above.</p>
          ) : (
            <div className="space-y-4">
              {departments.map((dept) => {
                const assignedIds = new Set((dept.doctors || []).map((d) => d._id));
                const unassignedDoctors = doctors.filter((d) => !assignedIds.has(d._id));
                return (
                  <div key={dept._id} className="rounded-2xl border border-mist bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="font-semibold text-ink text-lg">{dept.name}</div>
                      <div className="flex items-center gap-2">
                        <select
                          value={assignDoctorChoice[dept._id] || ""}
                          onChange={(e) =>
                            setAssignDoctorChoice((prev) => ({ ...prev, [dept._id]: e.target.value }))
                          }
                          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        >
                          <option value="">Assign doctor...</option>
                          {unassignedDoctors.map((d) => (
                            <option key={d._id} value={d._id}>{d.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => assignDoctor(dept._id)}
                          className="rounded-2xl bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy-light"
                        >
                          Assign
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(dept.doctors || []).length === 0 ? (
                        <span className="text-sm text-slate-500">No doctors assigned yet.</span>
                      ) : (
                        dept.doctors.map((doc) => (
                          <span key={doc._id} className="inline-flex items-center gap-2 rounded-full bg-mist px-3 py-1.5 text-xs text-ink">
                            {doc.name}
                            <button
                              onClick={() => removeDoctor(dept._id, doc._id)}
                              className="text-slate-400 hover:text-red-600"
                              title="Remove"
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    if (section === "leave-requests") {
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
      if (leaveRequests.length === 0) {
        return <EmptyRow>No pending leave requests right now.</EmptyRow>;
      }
      return (
        <div className="space-y-4">
          {leaveRequests.map((lr) => (
            <DataCard
              key={lr._id}
              title={lr.staffId?.name || "Unknown"}
              subtitle={lr.staffId?.role ? lr.staffId.role.charAt(0).toUpperCase() + lr.staffId.role.slice(1) : undefined}
              actions={
                <div className="flex gap-2">
                  <button
                    onClick={() => reviewLeave(lr._id, "approve")}
                    className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => reviewLeave(lr._id, "reject")}
                    className="rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              }
            >
              <DataGrid
                fields={[
                  { label: "From", value: new Date(lr.fromDate).toLocaleDateString() },
                  { label: "To", value: new Date(lr.toDate).toLocaleDateString() },
                  { label: "Reason", value: lr.reason },
                ]}
              />
            </DataCard>
          ))}
        </div>
      );
    }

    if (section === "appointments") {
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
      if (allAppointments.length === 0) {
        return <EmptyRow>No appointments booked yet.</EmptyRow>;
      }
      return (
        <div className="space-y-4">
          <div className="text-sm text-slate-soft">{allAppointments.length} appointment{allAppointments.length !== 1 ? "s" : ""}</div>
          {allAppointments.map((appt) => (
            <DataCard
              key={appt._id}
              title={appt.patientId?.name || appt.patientId?.phone || "Unknown patient"}
              subtitle={appt.appointmentCode ? `${appt.appointmentCode} · with ${appt.doctorId?.name || "Unknown doctor"}` : `with ${appt.doctorId?.name || "Unknown doctor"}`}
              actions={
                <div className="flex items-center gap-2">
                  <select
                    value={appt.status}
                    onChange={(e) => updateAppointmentStatusAdmin(appt._id, e.target.value)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-crimson/50 focus:outline-none"
                  >
                    {["booked", "completed", "cancelled", "no-show"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {appt.status !== "cancelled" && (
                    <button
                      onClick={() => cancelAppointmentAdmin(appt._id)}
                      className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              }
            >
              <DataGrid
                fields={[
                  { label: "Department", value: appt.department?.name || "—" },
                  { label: "Slot", value: new Date(appt.slotTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) },
                  { label: "Status", value: <StatusBadge status={appt.status} tone={statusTone(appt.status)} /> },
                ]}
              />
            </DataCard>
          ))}
        </div>
      );
    }

    if (section === "analytics") {
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
      if (!analytics) return <EmptyRow>No analytics data available yet.</EmptyRow>;

      const cards = [
        { label: "Total staff", value: analytics.staff.total },
        { label: "Total patients", value: analytics.patients.total },
        { label: "Departments", value: analytics.departments.total },
        { label: "Appointments today", value: analytics.appointments.today },
        { label: "Total appointments", value: analytics.appointments.total },
        { label: "Pending leave requests", value: analytics.leave.pending },
        { label: "Active queue tokens", value: analytics.queue.active },
        { label: "Avg. wait time (min)", value: analytics.queue.avgWaitMinutes ?? "—" },
      ];

      return (
        <div className="space-y-8">
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {cards.map((c) => (
              <div key={c.label} className="rounded-2xl border border-mist bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-soft/80">{c.label}</div>
                <div className="mt-2 text-3xl font-display font-semibold text-navy">{c.value}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <DataCard title="Staff by role">
              <div className="flex flex-wrap gap-2">
                {Object.entries(analytics.staff.byRole).map(([role, count]) => (
                  <span key={role} className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1.5 text-xs text-ink">
                    <span className="capitalize">{role}</span>
                    <span className="font-semibold text-navy">{count}</span>
                  </span>
                ))}
              </div>
            </DataCard>

            <DataCard title="Appointments by status">
              <div className="flex flex-wrap gap-2">
                {Object.entries(analytics.appointments.byStatus).map(([status, count]) => (
                  <StatusBadge key={status} status={`${status}: ${count}`} tone={statusTone(status)} />
                ))}
              </div>
            </DataCard>
          </div>
        </div>
      );
    }

    return (
      <EmptyState
        title={current.label}
        description={current.desc}
        accent={config.accent === "crimson" ? "crimson" : "navy"}
      />
    );
  };

  const renderProfileContent = () => {
    if (loading) return <div className="text-gray-600">Loading...</div>;
    if (!profileData || !profileForm) return <p className="text-gray-600">Profile not available.</p>;

    return (
      <div className="max-w-xl space-y-6">
        <div className="rounded-2xl border border-mist bg-white p-6 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div><span className="text-slate-500">Name:</span> <span className="font-semibold text-ink">{profileData.name}</span></div>
            <div><span className="text-slate-500">Username:</span> <span className="font-semibold text-ink">@{profileData.username}</span></div>
            <div><span className="text-slate-500">Role:</span> <span className="font-semibold text-ink capitalize">{profileData.role}</span></div>
            {profileData.department?.name && (
              <div><span className="text-slate-500">Department:</span> <span className="font-semibold text-ink">{profileData.department.name}</span></div>
            )}
            {profileData.designation && (
              <div><span className="text-slate-500">Designation:</span> <span className="font-semibold text-ink">{profileData.designation}</span></div>
            )}
            {profileData.degree && (
              <div><span className="text-slate-500">Degree:</span> <span className="font-semibold text-ink">{profileData.degree}</span></div>
            )}
            {profileData.registrationNo && (
              <div><span className="text-slate-500">Registration no:</span> <span className="font-semibold text-ink">{profileData.registrationNo}</span></div>
            )}
            {profileData.shiftTiming && (
              <div><span className="text-slate-500">Shift:</span> <span className="font-semibold text-ink capitalize">{profileData.shiftTiming}</span></div>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
        )}
        {profileMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{profileMessage}</div>
        )}

        <form onSubmit={submitProfileUpdate} className="space-y-4 rounded-2xl border border-mist bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-ink">Editable details</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Contact number</span>
              <input
                type="text"
                value={profileForm.contactNumber}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, contactNumber: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Email</span>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Blood group</span>
              <input
                type="text"
                value={profileForm.bloodGroup}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, bloodGroup: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm text-slate-600">Address</span>
              <input
                type="text"
                value={profileForm.address}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Emergency contact name</span>
              <input
                type="text"
                value={profileForm.emergencyContactName}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, emergencyContactName: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Emergency contact number</span>
              <input
                type="text"
                value={profileForm.emergencyContactNumber}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, emergencyContactNumber: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={profileSaving}
            className="rounded-full bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {profileSaving ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>
    );
  };

  const renderDoctorContent = () => {
    if (section === "appointments") {
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
      if (!payload || payload.length === 0) {
        return <EmptyRow>No appointments scheduled yet.</EmptyRow>;
      }
      return (
        <div className="space-y-4">
          <div className="text-sm text-slate-soft">{payload.length} appointment{payload.length !== 1 ? "s" : ""}</div>
          {payload.map((appt) => (
            <DataCard
              key={appt._id}
              title={appt.patientId?.name || appt.patientId?.phone || "Unknown patient"}
              subtitle={appt.appointmentCode ? `${appt.appointmentCode} · ${new Date(appt.slotTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}` : new Date(appt.slotTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
              actions={
                <div className="flex items-center gap-2">
                  <select
                    value={appt.status}
                    onChange={(e) => updateDoctorAppointmentStatus(appt._id, e.target.value)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-crimson/50 focus:outline-none"
                  >
                    {["booked", "completed", "cancelled", "no-show"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      setRxAppointmentId(rxAppointmentId === appt._id ? null : appt._id);
                      setRxStatus("");
                      setRxMedicines([{ ...EMPTY_MEDICINE_LINE }]);
                    }}
                    className="rounded-full bg-navy px-4 py-1.5 text-xs font-semibold text-white hover:bg-navy-light transition-colors"
                  >
                    {rxAppointmentId === appt._id ? "Close" : "Write prescription"}
                  </button>
                </div>
              }
            >
              {rxAppointmentId === appt._id && (
                <div className="rounded-xl bg-mist p-5 space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">New prescription</div>
                  {rxMedicines.map((line, index) => (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-[2fr_2fr_1fr_auto] gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Medicine name"
                        value={line.name}
                        onChange={(e) => updateRxMedicineLine(index, "name", e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Dosage (e.g. 1-0-1)"
                        value={line.dosage}
                        onChange={(e) => updateRxMedicineLine(index, "dosage", e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none"
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={line.quantity}
                        onChange={(e) => updateRxMedicineLine(index, "quantity", e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none"
                      />
                      {rxMedicines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRxMedicineLine(index)}
                          className="text-slate-400 hover:text-red-600 text-sm justify-self-start sm:justify-self-auto"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={addRxMedicineLine}
                      className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-ink hover:border-crimson/30 transition-colors"
                    >
                      + Add medicine
                    </button>
                    <button
                      type="button"
                      onClick={() => submitPrescription(appt)}
                      className="rounded-full bg-crimson px-4 py-1.5 text-xs font-semibold text-white hover:bg-crimson-dark transition-colors"
                    >
                      Save prescription
                    </button>
                    {rxStatus && <span className="text-xs font-medium text-slate-600">{rxStatus}</span>}
                  </div>
                </div>
              )}
            </DataCard>
          ))}
        </div>
      );
    }

    if (section === "prescriptions") {
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
      if (!payload || payload.length === 0) {
        return <EmptyRow>You haven't written any prescriptions yet.</EmptyRow>;
      }
      return (
        <div className="space-y-4">
          {payload.map((rx) => (
            <DataCard
              key={rx._id}
              title={rx.patientId?.name || rx.patientId?.phone || "Unknown patient"}
              subtitle={`Written ${new Date(rx.createdAt).toLocaleDateString()}`}
            >
              <div className="space-y-2.5">
                {rx.medicines?.map((med, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-xl bg-mist px-4 py-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-ink text-sm truncate">{med.name}</div>
                      <div className="text-xs text-slate-soft mt-0.5">{med.dosage}{med.quantity ? ` · qty ${med.quantity}` : ""}</div>
                    </div>
                    <StatusBadge status={med.availability} tone={statusTone(med.availability)} />
                  </div>
                ))}
              </div>
            </DataCard>
          ))}
        </div>
      );
    }

    if (section === "profile") {
      return renderProfileContent();
    }

    return (
      <EmptyState
        title={current.label}
        description={current.desc}
        accent={config.accent === "crimson" ? "crimson" : "navy"}
      />
    );
  };

  const renderStaffContent = () => {
    if (section === "appointment-lookup") {
      return (
        <div className="space-y-6">
          <DataCard>
            <form onSubmit={runAppointmentLookup} className="flex flex-wrap items-end gap-4">
              <label className="space-y-2 flex-1 min-w-[220px]">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Appointment ID</span>
                <input
                  type="text"
                  value={apptLookupValue}
                  onChange={(e) => setApptLookupValue(e.target.value)}
                  placeholder="e.g. APT-260723-4F2K"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm uppercase tracking-wide focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                />
              </label>
              <button
                type="submit"
                className="rounded-full bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors"
              >
                Look up
              </button>
            </form>
          </DataCard>

          {apptLookupError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{apptLookupError}</div>
          )}

          {apptLookupResult ? (
            <DataCard
              title={apptLookupResult.patientId?.name || apptLookupResult.patientId?.phone || "Unknown patient"}
              subtitle={apptLookupResult.appointmentCode}
              badge={<StatusBadge status={apptLookupResult.status} tone={statusTone(apptLookupResult.status)} />}
            >
              <DataGrid
                fields={[
                  { label: "Doctor", value: apptLookupResult.doctorId?.name || "—" },
                  { label: "Department", value: apptLookupResult.department?.name || "—" },
                  { label: "Slot", value: new Date(apptLookupResult.slotTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) },
                  { label: "Patient phone", value: apptLookupResult.patientId?.phone || "—" },
                ]}
              />
              <div className="mt-5 flex flex-wrap items-center gap-2 pt-4 border-t border-mist">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80 mr-1">Update status</span>
                {["booked", "completed", "cancelled", "no-show"].map((s) => (
                  <button
                    key={s}
                    onClick={() => updateApptLookupStatus(s)}
                    disabled={apptLookupResult.status === s}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                      apptLookupResult.status === s
                        ? "bg-mist text-slate-400 cursor-not-allowed"
                        : "border border-slate-300 bg-white text-ink hover:border-crimson/40"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </DataCard>
          ) : (
            apptLookupSearched === false && (
              <EmptyRow>Enter an appointment ID to view its details and update its status.</EmptyRow>
            )
          )}
        </div>
      );
    }

    if (section === "leave") {
      return (
        <div className="max-w-lg space-y-6">
          {leaveApplyStatus && (
            <div className="rounded-2xl border border-mist bg-white p-4 text-sm font-medium text-ink shadow-sm">{leaveApplyStatus}</div>
          )}
          <form onSubmit={submitLeaveApplication} className="space-y-5 rounded-2xl border border-mist bg-white p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">From date</span>
                <input
                  type="date"
                  value={leaveForm.fromDate}
                  onChange={(e) => setLeaveForm((prev) => ({ ...prev, fromDate: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">To date</span>
                <input
                  type="date"
                  value={leaveForm.toDate}
                  onChange={(e) => setLeaveForm((prev) => ({ ...prev, toDate: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                />
              </label>
            </div>
            <label className="space-y-2 block">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Reason</span>
              <textarea
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm((prev) => ({ ...prev, reason: e.target.value }))}
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
              />
            </label>
            <button
              type="submit"
              className="rounded-full bg-navy px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-light transition-colors"
            >
              Submit leave request
            </button>
          </form>
        </div>
      );
    }

    if (section === "leave-history") {
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
      if (!payload || payload.length === 0) {
        return <EmptyRow>No leave requests submitted yet.</EmptyRow>;
      }
      return (
        <div className="space-y-4">
          {payload.map((lr) => (
            <DataCard
              key={lr._id}
              title={`${new Date(lr.fromDate).toLocaleDateString()} – ${new Date(lr.toDate).toLocaleDateString()}`}
              badge={<StatusBadge status={lr.status} tone={statusTone(lr.status)} />}
            >
              <p className="text-sm text-slate-600 leading-relaxed">{lr.reason}</p>
            </DataCard>
          ))}
        </div>
      );
    }

    if (section === "queries") {
      if (actualRole !== "receptionist") {
        return (
          <DataCard>
            <p className="text-sm text-slate-600">Only receptionists manage patient queries. If you need to route a query, please ask a receptionist.</p>
          </DataCard>
        );
      }
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
      if (!payload || payload.length === 0) {
        return <EmptyRow>No open patient queries right now.</EmptyRow>;
      }
      return (
        <div className="space-y-4">
          {payload.map((q) => {
            const draft = replyDrafts[q._id] || { reply: "", assignedDoctorId: "" };
            return (
              <DataCard
                key={q._id}
                title={q.subject}
                subtitle={q.patientId?.name || q.patientId?.phone || "Unknown patient"}
                badge={<StatusBadge status={q.status} tone={statusTone(q.status)} />}
              >
                <p className="text-sm text-slate-600 leading-relaxed">{q.message}</p>

                {q.status !== "closed" && (
                  <div className="mt-4 space-y-3 pt-4 border-t border-mist">
                    <textarea
                      value={draft.reply}
                      onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [q._id]: { ...draft, reply: e.target.value } }))}
                      rows={2}
                      placeholder="Type a reply..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={draft.assignedDoctorId}
                        onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [q._id]: { ...draft, assignedDoctorId: e.target.value } }))}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-crimson/50 focus:outline-none"
                      >
                        <option value="">Assign doctor (optional)</option>
                        {doctors.map((d) => (
                          <option key={d._id} value={d._id}>{d.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => submitQueryReply(q._id)}
                        className="rounded-full bg-crimson px-4 py-1.5 text-xs font-semibold text-white hover:bg-crimson-dark transition-colors"
                      >
                        Send reply
                      </button>
                      <button
                        onClick={() => closeQuery(q._id)}
                        className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-ink hover:border-crimson/30 transition-colors"
                      >
                        Close query
                      </button>
                    </div>
                  </div>
                )}
              </DataCard>
            );
          })}
        </div>
      );
    }

    if (section === "profile") {
      return renderProfileContent();
    }

    return (
      <EmptyState
        title={current.label}
        description={current.desc}
        accent={config.accent === "crimson" ? "crimson" : "navy"}
      />
    );
  };

  const renderPharmacistContent = () => {
    if (section === "lookup") {
      return (
        <div className="space-y-6">
          <DataCard>
            <form onSubmit={runLookup} className="flex flex-wrap items-end gap-4">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">Search by</span>
                <select
                  value={lookupType}
                  onChange={(e) => setLookupType(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none"
                >
                  <option value="appointment">Appointment ID</option>
                  <option value="patient">Patient name</option>
                </select>
              </label>
              <label className="space-y-2 flex-1 min-w-[200px]">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-soft/80">{lookupType === "appointment" ? "Appointment ID" : "Patient name"}</span>
                <input
                  type="text"
                  value={lookupValue}
                  onChange={(e) => setLookupValue(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-crimson/50 focus:outline-none focus:ring-2 focus:ring-crimson/10"
                />
              </label>
              <button
                type="submit"
                className="rounded-full bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark transition-colors"
              >
                Search
              </button>
            </form>
          </DataCard>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
          )}

          {loading ? (
            <div className="text-gray-600">Searching...</div>
          ) : lookupSearched && (!lookupResults || lookupResults.length === 0) ? (
            <EmptyRow>No matching prescriptions found.</EmptyRow>
          ) : lookupResults && lookupResults.length > 0 ? (
            <div className="space-y-4">
              {lookupResults.map((rx) => (
                <DataCard
                  key={rx._id}
                  title={rx.patientId?.name || rx.patientId?.phone || "Unknown patient"}
                  subtitle={`Prescribed by ${rx.doctorId?.name || "Unknown doctor"}`}
                >
                  <div className="space-y-2.5">
                    {rx.medicines?.map((med, i) => (
                      <div key={i} className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl bg-mist px-4 py-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-ink text-sm truncate">{med.name}</div>
                          <div className="text-xs text-slate-soft mt-0.5">{med.dosage}{med.quantity ? ` · qty ${med.quantity}` : ""}</div>
                        </div>
                        <select
                          value={med.availability}
                          onChange={(e) => updateLookupMedicineAvailability(rx._id, i, e.target.value)}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-crimson/50 focus:outline-none"
                        >
                          <option value="pending">Pending</option>
                          <option value="available">Available</option>
                          <option value="unavailable">Unavailable</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </DataCard>
              ))}
            </div>
          ) : (
            <EmptyRow>Search by appointment ID or patient name to check a prescription against stock.</EmptyRow>
          )}
        </div>
      );
    }

    if (section === "inventory") {
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
      if (!payload || payload.length === 0) {
        return <EmptyRow>No medicines in inventory yet. Add one from the Add medicine tab.</EmptyRow>;
      }
      return (
        <div className="space-y-4">
          <SectionToolbar>
            <div className="text-sm text-slate-soft">{payload.length} medicine{payload.length !== 1 ? "s" : ""} in stock</div>
            {actionMessage && <div className="text-sm font-medium text-emerald-600">{actionMessage}</div>}
          </SectionToolbar>
          {payload.map((med) => {
            const draft = getMedicineDraft(med);
            return (
              <DataCard
                key={med._id}
                title={med.name}
                badge={<StatusBadge status={draft.isAvailable ? "Available" : "Unavailable"} tone={draft.isAvailable ? "success" : "danger"} />}
              >
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                  <label className="space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-soft/80">Quantity ({med.unit})</span>
                    <input
                      type="number"
                      value={draft.quantity}
                      onChange={(e) => setMedicineDraft(med._id, "quantity", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-soft/80">Price</span>
                    <input
                      type="number"
                      value={draft.price}
                      onChange={(e) => setMedicineDraft(med._id, "price", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-soft/80">Expiry</span>
                    <input
                      type="date"
                      value={draft.expiryDate}
                      onChange={(e) => setMedicineDraft(med._id, "expiryDate", e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-soft/80">Available</span>
                    <select
                      value={draft.isAvailable ? "yes" : "no"}
                      onChange={(e) => setMedicineDraft(med._id, "isAvailable", e.target.value === "yes")}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-crimson/50 focus:outline-none"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </label>
                </div>
                <div className="mt-4 flex gap-2 pt-4 border-t border-mist">
                  <button
                    onClick={() => saveMedicine(med)}
                    className="rounded-full bg-navy px-4 py-1.5 text-xs font-semibold text-white hover:bg-navy-light transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => deleteMedicineRow(med._id)}
                    className="rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </DataCard>
            );
          })}
        </div>
      );
    }

    if (section === "add-medicine") {
      return (
        <div className="max-w-xl space-y-6">
          {actionMessage && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{actionMessage}</div>
          )}
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
          )}
          <form onSubmit={submitAddMedicine} className="space-y-4 rounded-2xl border border-mist bg-white p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-slate-600">Medicine name *</span>
                <input
                  type="text"
                  value={addMedicineForm.name}
                  onChange={(e) => setAddMedicineForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-600">Unit</span>
                <select
                  value={addMedicineForm.unit}
                  onChange={(e) => setAddMedicineForm((prev) => ({ ...prev, unit: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  {["tablets", "ml", "strips", "vials", "capsules"].map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-600">Quantity *</span>
                <input
                  type="number"
                  min="0"
                  value={addMedicineForm.quantity}
                  onChange={(e) => setAddMedicineForm((prev) => ({ ...prev, quantity: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-600">Price *</span>
                <input
                  type="number"
                  min="0"
                  value={addMedicineForm.price}
                  onChange={(e) => setAddMedicineForm((prev) => ({ ...prev, price: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-600">Expiry date</span>
                <input
                  type="date"
                  value={addMedicineForm.expiryDate}
                  onChange={(e) => setAddMedicineForm((prev) => ({ ...prev, expiryDate: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Adding..." : "Add medicine"}
            </button>
          </form>
        </div>
      );
    }

    return (
      <EmptyState
        title={current.label}
        description={current.desc}
        accent={config.accent === "crimson" ? "crimson" : "navy"}
      />
    );
  };

  let content;
  if (config.role === "patient") content = renderPatientContent();
  else if (config.role === "admin") content = renderAdminContent();
  else if (config.role === "doctor") content = renderDoctorContent();
  else if (config.role === "staff") content = renderStaffContent();
  else if (config.role === "pharmacist") content = renderPharmacistContent();
  else
    content = (
      <EmptyState
        title={current.label}
        description={current.desc}
        accent={config.accent === "crimson" ? "crimson" : "navy"}
      />
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{current.label}</h1>
        <p className="text-gray-600 mt-2">{current.desc}</p>
      </div>

      {content}
    </div>
  );
}
