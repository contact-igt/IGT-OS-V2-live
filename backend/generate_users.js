const bcrypt = require('bcrypt');
const fs = require('fs');

const users = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'Sushil Athithiyaa', email: 'sushilathithiyaa@invictusglobaltech.com', role: 'admin', dept: 'sales', active: true, pass: 'IGT@Sushil2026' },
  { id: '00000000-0000-0000-0000-000000000002', name: 'Anitha Yogan', email: 'contact@invictusglobaltech.com', role: 'ops', dept: 'operations', active: true, pass: 'IGT@Anitha2026' },
  { id: '00000000-0000-0000-0000-000000000003', name: 'Abhilash B Nair', email: 'connect@invictusglobaltech.com', role: 'ops', dept: 'operations', active: true, pass: 'IGT@Abhilash2026' },
  { id: '00000000-0000-0000-0000-000000000004', name: 'Karan K', email: 'karankumar.igt@gmail.com', role: 'team', dept: 'design', active: true, pass: 'IGT@Karan2026' },
  { id: '00000000-0000-0000-0000-000000000005', name: 'NaveenRaj R', email: 'naveenraj.igt@gmail.com', role: 'team', dept: 'development', active: true, pass: 'IGT@Naveen2026' },
  { id: '00000000-0000-0000-0000-000000000006', name: 'Iyyappan', email: 'iyyappan.igt@gmail.com', role: 'team', dept: 'development', active: true, pass: 'IGT@Iyyappan2026' },
  { id: '00000000-0000-0000-0000-000000000007', name: 'Veeravel S', email: 'veeravel.igt@gmail.com', role: 'team', dept: 'development', active: true, pass: 'IGT@Veeravel2026' },
  { id: '00000000-0000-0000-0000-000000000008', name: 'Jashwanth Boddupally', email: 'jashwanth.boddupally.igt@gmail.com', role: 'team', dept: 'development', active: false, pass: 'IGT@Jashwanth2026' },
  { id: '00000000-0000-0000-0000-000000000009', name: 'Basheer', email: 'basheerinvictus@gmail.com', role: 'team', dept: 'video', active: true, pass: 'IGT@Basheer2026' },
  { id: '00000000-0000-0000-0000-000000000010', name: 'Pranesh Krishnan', email: 'praneshkrishnan.igt@gmail.com', role: 'team', dept: 'video', active: true, pass: 'IGT@Pranesh2026' },
  { id: '00000000-0000-0000-0000-000000000011', name: 'Aiswarya Saiju', email: 'aiswarya.saiju.igt@gmail.com', role: 'team', dept: 'performance_marketing', active: true, pass: 'IGT@Aiswarya2026' },
  { id: '00000000-0000-0000-0000-000000000012', name: 'Anju S', email: 'abhilash.igt@gmail.com', role: 'team', dept: 'performance_marketing', active: true, pass: 'IGT@Anju2026' },
  { id: '00000000-0000-0000-0000-000000000013', name: 'Rutuja Rajbhar', email: 'rutuja.rajbhar.igt@gmail.com', role: 'team', dept: 'performance_marketing', active: true, pass: 'IGT@Rutuja2026' },
  { id: '00000000-0000-0000-0000-000000000014', name: 'Tania Viquar', email: 'tania.viquar.igt@gmail.com', role: 'team', dept: 'sales', active: true, pass: 'IGT@Tania2026' },
  { id: '00000000-0000-0000-0000-000000000015', name: 'Dikshita Rajpurohit', email: 'dikshitarajpurohit.igt@gmail.com', role: 'team', dept: 'performance_marketing', active: true, pass: 'IGT@Dikshita2026' },
  { id: '00000000-0000-0000-0000-000000000016', name: 'Mohammad Thariq', email: 'thariq.dev@gmail.com', role: 'team', dept: 'development', active: true, pass: 'IGT@Thariq2026' },
];

async function generate() {
  let sql = 'INSERT INTO public.users (id, name, email, role, department, password_hash, must_change_password, is_active) VALUES \n';
  
  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    const hash = await bcrypt.hash(u.pass, 12);
    sql += `('${u.id}', '${u.name}', '${u.email}', '${u.role}', '${u.dept}', '${hash}', true, ${u.active})${i === users.length - 1 ? ';' : ','}\n`;
  }
  
  fs.writeFileSync('generated_users.sql', sql);
  console.log('Successfully wrote to generated_users.sql');
}

generate();
