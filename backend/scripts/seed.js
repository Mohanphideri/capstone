import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';
import Department from '../src/models/Department.js';
import Medicine from '../src/models/Medicine.js';
import { hashPassword, generateUsername, generateTempPassword } from '../src/utils/crypto.js';

dotenv.config();

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/heartstone');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Department.deleteMany({});
    await Medicine.deleteMany({});
    console.log('Cleared existing data');

    // Create departments
    const cardiology = await Department.create({ name: 'Cardiology' });
    const neurology = await Department.create({ name: 'Neurology' });
    const pediatrics = await Department.create({ name: 'Pediatrics' });
    const orthopedics = await Department.create({ name: 'Orthopedics' });

    console.log('Departments created');

    // Create admin account
    const adminPassword = 'admin@123';
    const adminHash = await hashPassword(adminPassword);

    const admin = await User.create({
      username: 'admin',
      passwordHash: adminHash,
      name: 'Admin User',
      email: 'admin@heartstone.com',
      role: 'admin',
      contactNumber: '+91-1234567890',
      mustResetPassword: false,
      isActive: true,
    });

    console.log(`Admin created:\n  Username: admin\n  Password: ${adminPassword}`);

    // Create sample doctors
    const doctors = [];
    const doctorData = [
      {
        name: 'Dr. Rina Kapoor',
        designation: 'Cardiologist',
        degree: 'MBBS, MD (Cardiology)',
        registrationNo: 'REG/CARD/001',
        department: cardiology._id,
        consultationFee: 500,
      },
      {
        name: 'Dr. Amit Singh',
        designation: 'Neurologist',
        degree: 'MBBS, MD (Neurology)',
        registrationNo: 'REG/NEURO/002',
        department: neurology._id,
        consultationFee: 600,
      },
      {
        name: 'Dr. Priya Patel',
        designation: 'Pediatrician',
        degree: 'MBBS, MD (Pediatrics)',
        registrationNo: 'REG/PEDI/003',
        department: pediatrics._id,
        consultationFee: 400,
      },
      {
        name: 'Dr. Rajesh Kumar',
        designation: 'Orthopedic Surgeon',
        degree: 'MBBS, MS (Orthopedics)',
        registrationNo: 'REG/ORTHO/004',
        department: orthopedics._id,
        consultationFee: 700,
      },
    ];

    for (const data of doctorData) {
      const tempPassword = generateTempPassword();
      const contactNumber = `+91-${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
      const username = generateUsername(data.name, contactNumber);
      const passwordHash = await hashPassword(tempPassword);

      const doctor = await User.create({
        username,
        passwordHash,
        role: 'doctor',
        name: data.name,
        email: `${username}@heartstone.com`,
        contactNumber,
        designation: data.designation,
        degree: data.degree,
        registrationNo: data.registrationNo,
        department: data.department,
        consultationFee: data.consultationFee,
        mustResetPassword: true,
        isActive: true,
      });

      doctors.push({
        doctor,
        tempPassword,
        username,
      });

      // Add doctor to department
      await Department.findByIdAndUpdate(data.department, {
        $push: { doctors: doctor._id },
      });
    }

    console.log(`${doctors.length} Doctors created`);
    console.log('Doctor temporary passwords:');
    doctors.forEach((d) => {
      console.log(`  ${d.username}: ${d.tempPassword}`);
    });

    // Create sample staff
    const staffRoles = [
      {
        role: 'nurse',
        names: ['Nurse Anjali', 'Nurse Bharti'],
      },
      {
        role: 'receptionist',
        names: ['Receptionist Ram', 'Receptionist Lisa'],
      },
      {
        role: 'accountant',
        names: ['Accountant John'],
      },
      {
        role: 'pharmacist',
        names: ['Pharmacist Maya'],
      },
    ];

    const staffMembers = [];

    for (const roleGroup of staffRoles) {
      for (const name of roleGroup.names) {
        const tempPassword = generateTempPassword();
        const contactNumber = `+91-${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
        const username = generateUsername(name, contactNumber);
        const passwordHash = await hashPassword(tempPassword);

        const staff = await User.create({
          username,
          passwordHash,
          role: roleGroup.role,
          name,
          email: `${username}@heartstone.com`,
          contactNumber,
          mustResetPassword: true,
          isActive: true,
        });

        staffMembers.push({
          staff,
          tempPassword,
          username,
          role: roleGroup.role,
        });
      }
    }

    console.log(`${staffMembers.length} Staff members created`);
    console.log('Staff temporary passwords:');
    staffMembers.forEach((s) => {
      console.log(`  ${s.username} (${s.role}): ${s.tempPassword}`);
    });

    // Create sample medicines
    const medicines = [
      { name: 'Aspirin', quantity: 100, unit: 'tablets', price: 5 },
      { name: 'Amoxicillin', quantity: 50, unit: 'capsules', price: 15 },
      { name: 'Paracetamol', quantity: 150, unit: 'tablets', price: 3 },
      { name: 'Ibuprofen', quantity: 80, unit: 'tablets', price: 8 },
      { name: 'Metformin', quantity: 60, unit: 'tablets', price: 10 },
      { name: 'Lisinopril', quantity: 40, unit: 'tablets', price: 12 },
      { name: 'Atorvastatin', quantity: 45, unit: 'tablets', price: 18 },
      { name: 'Omeprazole', quantity: 70, unit: 'capsules', price: 6 },
    ];

    for (const med of medicines) {
      await Medicine.create(med);
    }

    console.log(`${medicines.length} Medicines added to inventory`);

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📝 Admin Credentials:');
    console.log(`  Username: admin`);
    console.log(`  Password: ${adminPassword}`);
    console.log('\n⚠️  Doctor & Staff must change password on first login');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
