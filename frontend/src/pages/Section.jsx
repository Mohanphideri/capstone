import { useState, useEffect } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import { useAuth } from "../contexts/AuthContext.jsx";
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
      await appointmentService.bookAppointment({
        doctorId: selectedDoctor,
        departmentId: selectedDepartment,
        slotTime,
      });
      setBookingStatus("Appointment booked successfully.");
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
      const params = lookupType === "appointment" ? { appointmentId: lookupValue.trim() } : { patientName: lookupValue.trim() };
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
      return <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
    }

    if (section === "appointments") {
      if (!payload || payload.length === 0) {
        return <p className="text-gray-600">No appointments found. Book one from the Book Appointment tab.</p>;
      }

      return (
        <div className="space-y-4">
          {payload.map((appt) => (
            <div key={appt._id} className="rounded-[1.5rem] border border-mist bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-slate-500">Doctor</div>
                  <div className="font-semibold text-ink">{appt.doctorId?.name || "Unknown"}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Department</div>
                  <div className="font-semibold text-ink">{appt.department?.name || "Unknown"}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Slot</div>
                  <div className="font-semibold text-ink">{new Date(appt.slotTime).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Status</div>
                  <div className="rounded-full bg-mist px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink">{appt.status}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (section === "queue") {
      if (!payload) {
        return <p className="text-gray-600">You are not currently in a queue. Join one through the Book Appointment tab.</p>;
      }

      return (
        <div className="rounded-[1.75rem] border border-mist bg-white p-8 shadow-sm">
          <div className="text-sm text-slate-500">Your current token</div>
          <div className="mt-4 text-4xl font-semibold text-ink">{payload.token || "—"}</div>
          <div className="mt-3 text-sm text-slate-600">Department: {payload.department?.name || "N/A"}</div>
          <div className="mt-2 text-sm text-slate-600">Status: {payload.status || "Waiting"}</div>
        </div>
      );
    }

    if (section === "prescriptions") {
      if (!payload || payload.length === 0) {
        return <p className="text-gray-600">No prescriptions available yet. They will appear here after a doctor visit.</p>;
      }

      return (
        <div className="space-y-4">
          {payload.map((prescription) => (
            <div key={prescription._id} className="rounded-[1.5rem] border border-mist bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-slate-500">Doctor</div>
                  <div className="font-semibold text-ink">{prescription.doctorId?.name || "Unknown"}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Created</div>
                  <div className="font-semibold text-ink">{new Date(prescription.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {prescription.medicines?.map((med, index) => (
                  <div key={index} className="rounded-2xl bg-mist p-4">
                    <div className="font-semibold text-ink">{med.name}</div>
                    <div className="text-sm text-slate-600">{med.quantity} {med.unit}</div>
                    <div className="text-sm text-slate-600">Instructions: {med.instructions || "Follow directions"}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (section === "queries") {
      if (!payload || payload.length === 0) {
        return <p className="text-gray-600">You have no open queries. Send one through reception if needed.</p>;
      }

      return (
        <div className="space-y-4">
          {payload.map((query) => (
            <div key={query._id} className="rounded-[1.5rem] border border-mist bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-slate-500">Subject</div>
                  <div className="font-semibold text-ink">{query.subject}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Status</div>
                  <div className="rounded-full bg-mist px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink">{query.status}</div>
                </div>
              </div>
              <div className="mt-4 text-sm text-slate-600">{query.message}</div>
              {query.reply && (
                <div className="mt-4 rounded-3xl bg-navy p-4 text-sm text-white">
                  <div className="font-semibold">Reply from staff</div>
                  <div className="mt-2 text-slate-100">{query.reply}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (section === "book") {
      return (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Department</span>
              <select
                value={selectedDepartment}
                onChange={(e) => {
                  setSelectedDepartment(e.target.value);
                  setSelectedDoctor("");
                  setSlots([]);
                  setBookingStatus("");
                }}
                className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                <option value="">Select department</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>{dept.name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Doctor</span>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                disabled={!doctors.length}
                className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                <option value="">Select doctor</option>
                {doctors.map((doc) => (
                  <option key={doc._id} value={doc._id}>{doc.name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Visit date</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={fetchSlots}
              disabled={!selectedDepartment || !selectedDoctor || !selectedDate}
              className="rounded-3xl bg-crimson px-5 py-3 text-sm font-semibold text-white hover:bg-crimson-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              Find available slots
            </button>
            {bookingStatus && <div className="text-sm text-slate-600">{bookingStatus}</div>}
          </div>

          {slots.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {slots.map((slot) => (
                <button
                  key={slot.time}
                  onClick={() => bookAppointment(slot.time)}
                  className="rounded-[1.75rem] border border-mist bg-white p-4 text-left hover:border-crimson/30"
                >
                  <div className="text-sm text-slate-500">Available slot</div>
                  <div className="mt-2 text-lg font-semibold text-ink">{new Date(slot.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </button>
              ))}
            </div>
          ) : (
            selectedDoctor && selectedDate && !loading && (
              <p className="text-gray-600">No slots available for the selected doctor and date.</p>
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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <label className="flex items-center gap-3 text-sm text-slate-600">
              Filter by role
              <select
                value={staffRoleFilter}
                onChange={(e) => setStaffRoleFilter(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm"
              >
                <option value="">All roles</option>
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
            {actionMessage && <div className="text-sm text-emerald-600">{actionMessage}</div>}
          </div>

          {loading ? (
            <div className="text-gray-600">Loading...</div>
          ) : error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
          ) : staffList.length === 0 ? (
            <p className="text-gray-600">No staff members found. Add one from the Add staff tab.</p>
          ) : (
            <div className="space-y-3">
              {staffList.map((s) => (
                <div key={s._id} className="rounded-[1.5rem] border border-mist bg-white p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-ink">{s.name}</div>
                    <div className="text-sm text-slate-500">@{s.username}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Role</div>
                    <div className="rounded-full bg-mist px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink inline-block">{s.role}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Department</div>
                    <div className="text-sm text-ink">{s.department?.name || "—"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Contact</div>
                    <div className="text-sm text-ink">{s.contactNumber || s.email || "—"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Shift</div>
                    <div className="text-sm text-ink capitalize">{s.shiftTiming || "—"}</div>
                  </div>
                  <button
                    onClick={() => deactivateStaff(s._id)}
                    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    Deactivate
                  </button>
                </div>
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
            <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-800">
              <div className="font-semibold">Staff member added successfully</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div><span className="text-emerald-600">Username:</span> <strong>{newStaffResult.user.username}</strong></div>
                <div><span className="text-emerald-600">Temp password:</span> <strong>{newStaffResult.user.tempPassword}</strong></div>
              </div>
              <div className="mt-3 text-xs text-emerald-700">{newStaffResult.warning}</div>
            </div>
          )}

          {error && (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={submitAddStaff} className="space-y-6 rounded-[1.75rem] border border-mist bg-white p-6 shadow-sm">
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
              className="rounded-3xl bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark disabled:cursor-not-allowed disabled:opacity-60"
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
              className="rounded-3xl bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-light"
            >
              Create department
            </button>
          </form>

          {error && (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
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
                  <div key={dept._id} className="rounded-[1.5rem] border border-mist bg-white p-6 shadow-sm">
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
      if (error) return <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
      if (leaveRequests.length === 0) {
        return <p className="text-gray-600">No pending leave requests right now.</p>;
      }
      return (
        <div className="space-y-4">
          {leaveRequests.map((lr) => (
            <div key={lr._id} className="rounded-[1.5rem] border border-mist bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-slate-500">Staff member</div>
                  <div className="font-semibold text-ink">{lr.staffId?.name || "Unknown"} <span className="text-xs text-slate-400 uppercase">({lr.staffId?.role})</span></div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Dates</div>
                  <div className="text-sm text-ink">{new Date(lr.fromDate).toLocaleDateString()} – {new Date(lr.toDate).toLocaleDateString()}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => reviewLeave(lr._id, "approve")}
                    className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => reviewLeave(lr._id, "reject")}
                    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    Reject
                  </button>
                </div>
              </div>
              <div className="mt-3 text-sm text-slate-600">{lr.reason}</div>
            </div>
          ))}
        </div>
      );
    }

    if (section === "appointments") {
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (error) return <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
      if (allAppointments.length === 0) {
        return <p className="text-gray-600">No appointments booked yet.</p>;
      }
      return (
        <div className="space-y-3">
          {allAppointments.map((appt) => (
            <div key={appt._id} className="rounded-[1.5rem] border border-mist bg-white p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-sm text-slate-500">Patient</div>
                <div className="font-semibold text-ink">{appt.patientId?.name || appt.patientId?.phone || "Unknown"}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Doctor</div>
                <div className="text-sm text-ink">{appt.doctorId?.name || "Unknown"}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Department</div>
                <div className="text-sm text-ink">{appt.department?.name || "—"}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Slot</div>
                <div className="text-sm text-ink">{new Date(appt.slotTime).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={appt.status}
                  onChange={(e) => updateAppointmentStatusAdmin(appt._id, e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs"
                >
                  {["booked", "completed", "cancelled", "no-show"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {appt.status !== "cancelled" && (
                  <button
                    onClick={() => cancelAppointmentAdmin(appt._id)}
                    className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (section === "analytics") {
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (error) return <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
      if (!analytics) return <p className="text-gray-600">No analytics data available yet.</p>;

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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c) => (
              <div key={c.label} className="rounded-[1.5rem] border border-mist bg-white p-6 shadow-sm">
                <div className="text-sm text-slate-500">{c.label}</div>
                <div className="mt-2 text-3xl font-semibold text-ink">{c.value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-[1.5rem] border border-mist bg-white p-6 shadow-sm">
            <div className="font-semibold text-ink mb-3">Staff by role</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(analytics.staff.byRole).map(([role, count]) => (
                <span key={role} className="rounded-full bg-mist px-3 py-1.5 text-xs text-ink">
                  {role}: <strong>{count}</strong>
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-mist bg-white p-6 shadow-sm">
            <div className="font-semibold text-ink mb-3">Appointments by status</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(analytics.appointments.byStatus).map(([status, count]) => (
                <span key={status} className="rounded-full bg-mist px-3 py-1.5 text-xs text-ink">
                  {status}: <strong>{count}</strong>
                </span>
              ))}
            </div>
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
        <div className="rounded-[1.5rem] border border-mist bg-white p-6 shadow-sm">
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
          <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
        )}
        {profileMessage && (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{profileMessage}</div>
        )}

        <form onSubmit={submitProfileUpdate} className="space-y-4 rounded-[1.75rem] border border-mist bg-white p-6 shadow-sm">
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
            className="rounded-3xl bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark disabled:cursor-not-allowed disabled:opacity-60"
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
      if (error) return <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
      if (!payload || payload.length === 0) {
        return <p className="text-gray-600">No appointments scheduled yet.</p>;
      }
      return (
        <div className="space-y-4">
          {payload.map((appt) => (
            <div key={appt._id} className="rounded-[1.5rem] border border-mist bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-slate-500">Patient</div>
                  <div className="font-semibold text-ink">{appt.patientId?.name || appt.patientId?.phone || "Unknown"}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Slot</div>
                  <div className="text-sm text-ink">{new Date(appt.slotTime).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={appt.status}
                    onChange={(e) => updateDoctorAppointmentStatus(appt._id, e.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs"
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
                    className="rounded-2xl bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy-light"
                  >
                    {rxAppointmentId === appt._id ? "Close" : "Write prescription"}
                  </button>
                </div>
              </div>

              {rxAppointmentId === appt._id && (
                <div className="mt-5 rounded-2xl bg-mist p-4 space-y-3">
                  {rxMedicines.map((line, index) => (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-[2fr_2fr_1fr_auto] gap-2">
                      <input
                        type="text"
                        placeholder="Medicine name"
                        value={line.name}
                        onChange={(e) => updateRxMedicineLine(index, "name", e.target.value)}
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Dosage (e.g. 1-0-1)"
                        value={line.dosage}
                        onChange={(e) => updateRxMedicineLine(index, "dosage", e.target.value)}
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={line.quantity}
                        onChange={(e) => updateRxMedicineLine(index, "quantity", e.target.value)}
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                      {rxMedicines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRxMedicineLine(index)}
                          className="text-slate-400 hover:text-red-600 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={addRxMedicineLine}
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-ink hover:border-crimson/30"
                    >
                      + Add medicine
                    </button>
                    <button
                      type="button"
                      onClick={() => submitPrescription(appt)}
                      className="rounded-2xl bg-crimson px-4 py-2 text-xs font-semibold text-white hover:bg-crimson-dark"
                    >
                      Save prescription
                    </button>
                    {rxStatus && <span className="text-xs text-slate-600">{rxStatus}</span>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (section === "prescriptions") {
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (error) return <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
      if (!payload || payload.length === 0) {
        return <p className="text-gray-600">You haven't written any prescriptions yet.</p>;
      }
      return (
        <div className="space-y-4">
          {payload.map((rx) => (
            <div key={rx._id} className="rounded-[1.5rem] border border-mist bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-slate-500">Patient</div>
                  <div className="font-semibold text-ink">{rx.patientId?.name || rx.patientId?.phone || "Unknown"}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Written</div>
                  <div className="text-sm text-ink">{new Date(rx.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {rx.medicines?.map((med, i) => (
                  <div key={i} className="rounded-2xl bg-mist p-3 text-sm text-ink flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{med.name}</span>
                    <span className="text-slate-600">{med.dosage} {med.quantity ? `· qty ${med.quantity}` : ""}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs uppercase tracking-wide">{med.availability}</span>
                  </div>
                ))}
              </div>
            </div>
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
    if (section === "leave") {
      return (
        <div className="max-w-lg space-y-6">
          {leaveApplyStatus && (
            <div className="rounded-3xl border border-mist bg-white p-4 text-sm text-ink shadow-sm">{leaveApplyStatus}</div>
          )}
          <form onSubmit={submitLeaveApplication} className="space-y-4 rounded-[1.75rem] border border-mist bg-white p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-slate-600">From date</span>
                <input
                  type="date"
                  value={leaveForm.fromDate}
                  onChange={(e) => setLeaveForm((prev) => ({ ...prev, fromDate: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-600">To date</span>
                <input
                  type="date"
                  value={leaveForm.toDate}
                  onChange={(e) => setLeaveForm((prev) => ({ ...prev, toDate: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                />
              </label>
            </div>
            <label className="space-y-2 block">
              <span className="text-sm text-slate-600">Reason</span>
              <textarea
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm((prev) => ({ ...prev, reason: e.target.value }))}
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              />
            </label>
            <button
              type="submit"
              className="rounded-3xl bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy-light"
            >
              Submit leave request
            </button>
          </form>
        </div>
      );
    }

    if (section === "leave-history") {
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (error) return <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
      if (!payload || payload.length === 0) {
        return <p className="text-gray-600">No leave requests submitted yet.</p>;
      }
      const statusColor = { pending: "bg-amber-100 text-amber-700", approved: "bg-emerald-100 text-emerald-700", rejected: "bg-red-100 text-red-700" };
      return (
        <div className="space-y-4">
          {payload.map((lr) => (
            <div key={lr._id} className="rounded-[1.5rem] border border-mist bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="text-sm text-ink">{new Date(lr.fromDate).toLocaleDateString()} – {new Date(lr.toDate).toLocaleDateString()}</div>
                <div className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusColor[lr.status] || "bg-mist text-ink"}`}>{lr.status}</div>
              </div>
              <div className="mt-3 text-sm text-slate-600">{lr.reason}</div>
            </div>
          ))}
        </div>
      );
    }

    if (section === "queries") {
      if (actualRole !== "receptionist") {
        return (
          <div className="rounded-[1.5rem] border border-mist bg-white p-6 text-sm text-slate-600 shadow-sm">
            Only receptionists manage patient queries. If you need to route a query, please ask a receptionist.
          </div>
        );
      }
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (error) return <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
      if (!payload || payload.length === 0) {
        return <p className="text-gray-600">No open patient queries right now.</p>;
      }
      return (
        <div className="space-y-4">
          {payload.map((q) => {
            const draft = replyDrafts[q._id] || { reply: "", assignedDoctorId: "" };
            return (
              <div key={q._id} className="rounded-[1.5rem] border border-mist bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-sm text-slate-500">Patient</div>
                    <div className="font-semibold text-ink">{q.patientId?.name || q.patientId?.phone || "Unknown"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Subject</div>
                    <div className="font-semibold text-ink">{q.subject}</div>
                  </div>
                  <div className="rounded-full bg-mist px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink">{q.status}</div>
                </div>
                <div className="mt-3 text-sm text-slate-600">{q.message}</div>

                {q.status !== "closed" && (
                  <div className="mt-4 space-y-2">
                    <textarea
                      value={draft.reply}
                      onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [q._id]: { ...draft, reply: e.target.value } }))}
                      rows={2}
                      placeholder="Type a reply..."
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={draft.assignedDoctorId}
                        onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [q._id]: { ...draft, assignedDoctorId: e.target.value } }))}
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs"
                      >
                        <option value="">Assign doctor (optional)</option>
                        {doctors.map((d) => (
                          <option key={d._id} value={d._id}>{d.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => submitQueryReply(q._id)}
                        className="rounded-2xl bg-crimson px-4 py-2 text-xs font-semibold text-white hover:bg-crimson-dark"
                      >
                        Send reply
                      </button>
                      <button
                        onClick={() => closeQuery(q._id)}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-ink hover:border-crimson/30"
                      >
                        Close query
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
          <form onSubmit={runLookup} className="flex flex-wrap items-end gap-3">
            <label className="space-y-2">
              <span className="text-sm text-slate-600">Search by</span>
              <select
                value={lookupType}
                onChange={(e) => setLookupType(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                <option value="appointment">Appointment ID</option>
                <option value="patient">Patient name</option>
              </select>
            </label>
            <label className="space-y-2 flex-1 min-w-[200px]">
              <span className="text-sm text-slate-600">{lookupType === "appointment" ? "Appointment ID" : "Patient name"}</span>
              <input
                type="text"
                value={lookupValue}
                onChange={(e) => setLookupValue(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              />
            </label>
            <button
              type="submit"
              className="rounded-3xl bg-crimson px-5 py-3 text-sm font-semibold text-white hover:bg-crimson-dark"
            >
              Search
            </button>
          </form>

          {error && (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
          )}

          {loading ? (
            <div className="text-gray-600">Searching...</div>
          ) : lookupSearched && (!lookupResults || lookupResults.length === 0) ? (
            <p className="text-gray-600">No matching prescriptions found.</p>
          ) : lookupResults && lookupResults.length > 0 ? (
            <div className="space-y-4">
              {lookupResults.map((rx) => (
                <div key={rx._id} className="rounded-[1.5rem] border border-mist bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-sm text-slate-500">Patient</div>
                      <div className="font-semibold text-ink">{rx.patientId?.name || rx.patientId?.phone || "Unknown"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Doctor</div>
                      <div className="text-sm text-ink">{rx.doctorId?.name || "Unknown"}</div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {rx.medicines?.map((med, i) => (
                      <div key={i} className="rounded-2xl bg-mist p-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-ink text-sm">{med.name}</div>
                          <div className="text-xs text-slate-600">{med.dosage} {med.quantity ? `· qty ${med.quantity}` : ""}</div>
                        </div>
                        <select
                          value={med.availability}
                          onChange={(e) => updateLookupMedicineAvailability(rx._id, i, e.target.value)}
                          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs"
                        >
                          <option value="pending">Pending</option>
                          <option value="available">Available</option>
                          <option value="unavailable">Unavailable</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">Search by appointment ID or patient name to check a prescription against stock.</p>
          )}
        </div>
      );
    }

    if (section === "inventory") {
      if (loading) return <div className="text-gray-600">Loading...</div>;
      if (error) return <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
      if (!payload || payload.length === 0) {
        return <p className="text-gray-600">No medicines in inventory yet. Add one from the Add medicine tab.</p>;
      }
      return (
        <div className="space-y-3">
          {actionMessage && <div className="text-sm text-emerald-600">{actionMessage}</div>}
          {payload.map((med) => {
            const draft = getMedicineDraft(med);
            return (
              <div key={med._id} className="rounded-[1.5rem] border border-mist bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="font-semibold text-ink">{med.name}</div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${draft.isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {draft.isAvailable ? "Available" : "Unavailable"}
                  </span>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  <label className="space-y-1">
                    <span className="text-xs text-slate-500">Quantity ({med.unit})</span>
                    <input
                      type="number"
                      value={draft.quantity}
                      onChange={(e) => setMedicineDraft(med._id, "quantity", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-slate-500">Price</span>
                    <input
                      type="number"
                      value={draft.price}
                      onChange={(e) => setMedicineDraft(med._id, "price", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-slate-500">Expiry</span>
                    <input
                      type="date"
                      value={draft.expiryDate}
                      onChange={(e) => setMedicineDraft(med._id, "expiryDate", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-slate-500">Available</span>
                    <select
                      value={draft.isAvailable ? "yes" : "no"}
                      onChange={(e) => setMedicineDraft(med._id, "isAvailable", e.target.value === "yes")}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </label>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => saveMedicine(med)}
                    className="rounded-2xl bg-navy px-4 py-2 text-xs font-semibold text-white hover:bg-navy-light"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => deleteMedicineRow(med._id)}
                    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (section === "add-medicine") {
      return (
        <div className="max-w-xl space-y-6">
          {actionMessage && (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{actionMessage}</div>
          )}
          {error && (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
          )}
          <form onSubmit={submitAddMedicine} className="space-y-4 rounded-[1.75rem] border border-mist bg-white p-6 shadow-sm">
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
              className="rounded-3xl bg-crimson px-6 py-3 text-sm font-semibold text-white hover:bg-crimson-dark disabled:cursor-not-allowed disabled:opacity-60"
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
