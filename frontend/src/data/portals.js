export const portals = {
  admin: {
    role: "admin",
    label: "Admin",
    tagline: "Hospital-wide oversight",
    accent: "crimson",
    sections: [
      { path: "staff", label: "Staff directory", desc: "Every doctor, nurse, accountant, receptionist and pharmacist will be listed here, with tools to add, edit or deactivate an account." },
      { path: "add-staff", label: "Add staff", desc: "Add a new staff member here. HeartStone will generate their username and a one-time temporary password automatically." },
      { path: "departments", label: "Departments", desc: "Departments and the doctors assigned to each will appear here once created." },
      { path: "leave-requests", label: "Leave requests", desc: "Pending leave requests from staff will land here for your approval or rejection." },
      { path: "appointments", label: "All appointments", desc: "A hospital-wide view of every booked, completed and cancelled appointment will appear here." },
      { path: "analytics", label: "Analytics", desc: "Average wait time, patients served per day and peak hours will be charted here once visit data starts flowing in." },
    ],
  },
  doctor: {
    role: "doctor",
    label: "Doctor",
    tagline: "Dr. Rina Kapoor · Cardiology",
    accent: "navy",
    sections: [
      { path: "appointments", label: "My appointments", desc: "Your appointments for the selected date will appear here, with patient details for each slot." },
      { path: "prescriptions", label: "Prescriptions", desc: "Prescriptions you've written will be listed here, tied to the appointment they belong to." },
      { path: "profile", label: "Profile", desc: "Your name, designation, qualification and registration number will be shown and editable here." },
    ],
  },
  staff: {
    role: "staff",
    label: "Nurse / Accountant / Receptionist",
    tagline: "Shared staff workspace",
    accent: "navy",
    sections: [
      { path: "schedule", label: "My schedule", desc: "Your upcoming shifts will be shown here once the roster is connected." },
      { path: "appointment-lookup", label: "Appointment lookup", desc: "Look up any appointment by its ID to verify details or check a patient in." },
      { path: "leave", label: "Apply for leave", desc: "Submit a leave request with a date range and reason from here." },
      { path: "leave-history", label: "Leave history", desc: "Past leave requests and their approval status will be tracked here." },
      { path: "queries", label: "Patient queries", desc: "Receptionists will see open patient queries here, and can reply or assign a doctor.", roleOnly: "Receptionist" },
      { path: "profile", label: "Profile", desc: "Your contact details and shift information will be editable here." },
    ],
  },
  patient: {
    role: "patient",
    label: "Patient",
    tagline: "Welcome back",
    accent: "crimson",
    sections: [
      { path: "appointments", label: "My appointments", desc: "Your upcoming and past visits will appear here once you book your first appointment." },
      { path: "book", label: "Book appointment", desc: "Choose a department, doctor and slot to book your next visit." },
      { path: "queue", label: "Live queue", desc: "If you join a walk-in queue, your token number and live wait time will be tracked here." },
      { path: "prescriptions", label: "Prescriptions", desc: "Prescriptions written for you by a doctor will be listed here." },
      { path: "queries", label: "My queries", desc: "Questions you've sent to the front desk, and their replies, will show up here." },
    ],
  },
  pharmacist: {
    role: "pharmacist",
    label: "Pharmacist",
    tagline: "Pharmacy desk",
    accent: "navy",
    sections: [
      { path: "lookup", label: "Prescription lookup", desc: "Search a prescription by appointment ID or patient name to check it against current stock." },
      { path: "inventory", label: "Inventory", desc: "Your medicine inventory — quantity, price and expiry — will be managed from here." },
      { path: "add-medicine", label: "Add medicine", desc: "Add a new medicine to inventory with its quantity, unit and price." },
    ],
  },
};

export const loginRoles = [
  { key: "patient", label: "Patient", method: "Mobile number + OTP" },
  { key: "staff", label: "Doctor / Staff / Pharmacist", method: "Username + password" },
  { key: "admin", label: "Admin", method: "Username + password" },
];
