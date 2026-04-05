#!/usr/bin/env node

/**
 * =========================================================
 *  AI-Based Multilingual Lecture System — Backend API Tests
 * =========================================================
 *  Tests all 37 endpoints across 6 route groups:
 *    Health, Auth, Courses, Lectures, Quizzes, Admin/Users
 *
 *  Usage:
 *    node test-api.js                  # run against localhost:5000
 *    API_URL=http://host:port node test-api.js
 *
 *  Prerequisites:
 *    • Backend running on API_URL
 *    • Database seeded (node seed.js)
 * =========================================================
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────────
const API_URL = process.env.API_URL;
const VERBOSE = process.env.VERBOSE === '1';

// Test accounts from seed.js
const ACCOUNTS = {
  admin:     { email: 'admin@demo.com',     password: 'admin123' },
  professor: { email: 'professor@demo.com', password: 'prof123' },
  student:   { email: 'student@demo.com',   password: 'student123' },
  deptAdmin: { email: 'deptadmin@demo.com',  password: 'admin123' },
};

// ── Helpers ─────────────────────────────────────────────────
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red:   '\x1b[31m',
  yellow:'\x1b[33m',
  cyan:  '\x1b[36m',
  dim:   '\x1b[2m',
  bold:  '\x1b[1m',
  magenta: '\x1b[35m',
};

let passed = 0, failed = 0, skipped = 0;
const failures = [];

function log(color, symbol, msg) {
  console.log(`  ${color}${symbol}${colors.reset} ${msg}`);
}

function pass(name, detail = '') {
  passed++;
  log(colors.green, '✓', `${name}${detail ? colors.dim + ' — ' + detail + colors.reset : ''}`);
}

function fail(name, reason) {
  failed++;
  failures.push({ name, reason });
  log(colors.red, '✗', `${name} ${colors.dim}— ${reason}${colors.reset}`);
}

function skip(name, reason) {
  skipped++;
  log(colors.yellow, '○', `${name} ${colors.dim}— SKIPPED: ${reason}${colors.reset}`);
}

function section(title) {
  console.log(`\n${colors.cyan}${colors.bold}━━ ${title} ━━${colors.reset}`);
}

/** Generic HTTP request that returns { status, data, headers } */
function request(method, urlPath, { body, token, headers: extra, isMultipart } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, API_URL);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const headers = { ...extra };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let payload;
    if (isMultipart) {
      // body is already a Buffer with headers set externally
      payload = body;
    } else if (body && typeof body === 'object') {
      payload = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
    }
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers,
    };

    const req = lib.request(opts, (res) => {
      let chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        let data;
        try { data = JSON.parse(raw); } catch { data = raw; }
        if (VERBOSE) {
          console.log(colors.dim + `    ${method} ${urlPath} → ${res.statusCode}` + colors.reset);
        }
        resolve({ status: res.statusCode, data, headers: res.headers });
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Request timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

function buildMultipart(fields, filePath, fileFieldName) {
  const boundary = '----TestBoundary' + Date.now();
  const parts = [];

  for (const [key, val] of Object.entries(fields)) {
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`
    );
  }

  if (filePath && fileFieldName) {
    const fileName = path.basename(filePath);
    const fileContent = fs.readFileSync(filePath);
    const ext = path.extname(fileName).toLowerCase();
    const mimeMap = { '.pdf': 'application/pdf', '.txt': 'text/plain', '.mp4': 'video/mp4', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
    const mime = mimeMap[ext] || 'application/octet-stream';
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="${fileFieldName}"; filename="${fileName}"\r\nContent-Type: ${mime}\r\n\r\n`
    );
    parts.push(fileContent);
    parts.push('\r\n');
  }

  parts.push(`--${boundary}--\r\n`);

  const buffers = parts.map(p => (typeof p === 'string' ? Buffer.from(p) : p));
  const body = Buffer.concat(buffers);
  const headers = { 'Content-Type': `multipart/form-data; boundary=${boundary}` };
  return { body, headers };
}

// Assert helpers
function assert(cond, testName, detail, failDetail) {
  if (cond) pass(testName, detail);
  else fail(testName, failDetail || 'Assertion failed');
}

function assertStatus(res, expected, testName) {
  assert(
    res.status === expected,
    testName,
    `${res.status}`,
    `Expected ${expected}, got ${res.status}: ${JSON.stringify(res.data).slice(0, 200)}`
  );
  return res.status === expected;
}

// ─────────────────────────────────────────────────────────────
//  TEST SUITES
// ─────────────────────────────────────────────────────────────

async function testHealth() {
  section('1. Health Check');
  const res = await request('GET', '/api/health');
  assertStatus(res, 200, 'GET /api/health');
  assert(res.data?.status === 'ok', 'Health status field', 'status=ok', `status=${res.data?.status}`);
}

// ── AUTH ─────────────────────────────────────────────────────
const tokens = {};
const userIds = {};

async function testAuth() {
  section('2. Authentication');

  // 2a. Register a temporary user
  const tempEmail = `test_${Date.now()}@test.com`;
  const regRes = await request('POST', '/api/auth/register', {
    body: { email: tempEmail, password: 'test123456', name: 'Test User' },
  });
  assertStatus(regRes, 201, 'POST /api/auth/register (new user)');
  assert(!!regRes.data?.token, 'Register returns JWT', 'token present', 'no token returned');

  // 2b. Register duplicate
  const dupRes = await request('POST', '/api/auth/register', {
    body: { email: tempEmail, password: 'test123456', name: 'Dup User' },
  });
  assert(dupRes.status >= 400, 'Register duplicate email rejected', `${dupRes.status}`, `Expected 4xx, got ${dupRes.status}`);

  // 2c. Register with validation errors
  const badReg = await request('POST', '/api/auth/register', {
    body: { email: 'bad', password: '12', name: '' },
  });
  assert(badReg.status >= 400, 'Register validation errors', `${badReg.status}`);

  // 2d. Login with each seeded account
  for (const [role, creds] of Object.entries(ACCOUNTS)) {
    const loginRes = await request('POST', '/api/auth/login', { body: creds });
    if (assertStatus(loginRes, 200, `Login as ${role} (${creds.email})`)) {
      tokens[role] = loginRes.data.token;
      userIds[role] = loginRes.data.user?._id || loginRes.data.user?.id;
      assert(!!tokens[role], `  JWT received for ${role}`, '', 'No token');
    }
  }

  // 2e. Login with wrong password
  const wrongPw = await request('POST', '/api/auth/login', {
    body: { email: 'admin@demo.com', password: 'wrongpassword' },
  });
  assert(wrongPw.status >= 400, 'Login wrong password rejected', `${wrongPw.status}`);

  // 2f. Login with non-existent email
  const noUser = await request('POST', '/api/auth/login', {
    body: { email: 'nonexistent@nowhere.com', password: '123456' },
  });
  assert(noUser.status >= 400, 'Login non-existent email rejected', `${noUser.status}`);

  // 2g. Get profile
  if (tokens.admin) {
    const profRes = await request('GET', '/api/auth/profile', { token: tokens.admin });
    assertStatus(profRes, 200, 'GET /api/auth/profile (admin)');
    assert(profRes.data?.user?.email === ACCOUNTS.admin.email, '  Profile email matches', profRes.data?.user?.email);
  }

  // 2h. Update profile
  if (tokens.student) {
    const updRes = await request('PUT', '/api/auth/profile', {
      token: tokens.student,
      body: { name: 'Updated Student' },
    });
    assertStatus(updRes, 200, 'PUT /api/auth/profile (update name)');
  }

  // 2i. Unauthenticated access
  const noAuth = await request('GET', '/api/auth/profile');
  assert(noAuth.status === 401, 'GET /api/auth/profile without token → 401', `${noAuth.status}`);

  // Clean up temp user
  if (tokens.admin && regRes.data?.user?._id) {
    await request('DELETE', `/api/users/${regRes.data.user._id}`, { token: tokens.admin });
  }
}

// ── PUBLIC COURSES ──────────────────────────────────────────
let coursesList = [];

async function testCourses() {
  section('3. Public Courses Endpoint');

  if (!tokens.student) { skip('Courses tests', 'No student token'); return; }

  const res = await request('GET', '/api/courses', { token: tokens.student });
  assertStatus(res, 200, 'GET /api/courses (student)');
  coursesList = res.data?.courses || [];
  assert(Array.isArray(coursesList), 'Returns courses array', `${coursesList.length} courses`);

  // Professor can also access
  if (tokens.professor) {
    const profRes = await request('GET', '/api/courses', { token: tokens.professor });
    assertStatus(profRes, 200, 'GET /api/courses (professor)');
  }

  // Filter by search
  const searchRes = await request('GET', '/api/courses?search=CS', { token: tokens.student });
  assertStatus(searchRes, 200, 'GET /api/courses?search=CS');

  // Unauthenticated
  const noAuth = await request('GET', '/api/courses');
  assert(noAuth.status === 401, 'GET /api/courses without token → 401', `${noAuth.status}`);
}

// ── LECTURES ────────────────────────────────────────────────
let testLectureId = null;

async function testLectures() {
  section('4. Lectures');

  if (!tokens.professor) { skip('Lectures tests', 'No professor token'); return; }

  const courseId = coursesList[0]?._id;
  if (!courseId) { skip('Lecture create/upload', 'No courses in DB'); return; }

  // 4a. Create a test PDF file for upload
  const testFilePath = path.join(__dirname, 'test-upload.pdf');
  fs.writeFileSync(testFilePath, '%PDF-1.4 test content for api testing');

  // 4b. Upload a lecture
  const { body, headers } = buildMultipart(
    { title: 'API Test Lecture', description: 'Created by test script', course: courseId, semester: '1' },
    testFilePath,
    'file'
  );
  const createRes = await request('POST', '/api/lectures', {
    token: tokens.professor,
    body,
    headers,
    isMultipart: true,
  });
  if (assertStatus(createRes, 201, 'POST /api/lectures (upload lecture)')) {
    testLectureId = createRes.data?.lecture?._id;
    assert(!!testLectureId, '  Lecture ID returned', testLectureId);
  }

  // Clean up test file
  try { fs.unlinkSync(testFilePath); } catch {}

  // 4c. List lectures
  const listRes = await request('GET', '/api/lectures', { token: tokens.student });
  assertStatus(listRes, 200, 'GET /api/lectures (list)');
  assert(Array.isArray(listRes.data?.lectures), '  Returns lectures array', `${listRes.data?.lectures?.length} lectures`);

  // 4d. Filter by course
  const filterRes = await request('GET', `/api/lectures?course=${courseId}`, { token: tokens.student });
  assertStatus(filterRes, 200, 'GET /api/lectures?course=<id>');

  // 4e. Get single lecture
  if (testLectureId) {
    const getRes = await request('GET', `/api/lectures/${testLectureId}`, { token: tokens.student });
    assertStatus(getRes, 200, 'GET /api/lectures/:id');
    assert(getRes.data?.lecture?.title === 'API Test Lecture', '  Title matches', getRes.data?.lecture?.title);
  }

  // 4f. Update lecture (metadata only)
  if (testLectureId) {
    const updFields = buildMultipart({ title: 'API Test Lecture Updated' }, null, null);
    const updRes = await request('PUT', `/api/lectures/${testLectureId}`, {
      token: tokens.professor,
      body: updFields.body,
      headers: updFields.headers,
      isMultipart: true,
    });
    assertStatus(updRes, 200, 'PUT /api/lectures/:id (update title)');
  }

  // 4g. Student cannot create lectures
  const studentCreate = buildMultipart(
    { title: 'Student Lecture', course: courseId },
    null, null
  );
  const studentRes = await request('POST', '/api/lectures', {
    token: tokens.student,
    body: studentCreate.body,
    headers: studentCreate.headers,
    isMultipart: true,
  });
  assert(studentRes.status === 403, 'Student cannot POST /api/lectures → 403', `${studentRes.status}`);

  // 4h. Unauthenticated
  const noAuth = await request('GET', '/api/lectures');
  assert(noAuth.status === 401, 'GET /api/lectures without token → 401', `${noAuth.status}`);
}

// ── QUIZZES ─────────────────────────────────────────────────
let testQuizId = null;

async function testQuizzes() {
  section('5. Quizzes');

  if (!tokens.professor) { skip('Quizzes tests', 'No professor token'); return; }

  const courseId = coursesList[0]?._id;
  if (!courseId) { skip('Quiz tests', 'No courses in DB'); return; }

  // 5a. Create quiz
  const quizData = {
    title: 'API Test Quiz',
    course: courseId,
    timeLimit: 15,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    questions: [
      {
        question: 'What does API stand for?',
        type: 'mcq',
        options: ['Application Programming Interface', 'Applied Program Integration', 'Auto Protocol Interface', 'None'],
        correctAnswer: 'Application Programming Interface',
        points: 2,
      },
      {
        question: 'What is REST?',
        type: 'mcq',
        options: ['Representational State Transfer', 'Remote Execution Service Tool', 'Real-time Event Streaming', 'None'],
        correctAnswer: 'Representational State Transfer',
        points: 3,
      },
      {
        question: 'Explain the MVC pattern.',
        type: 'descriptive',
        points: 5,
      },
    ],
  };

  const createRes = await request('POST', '/api/quizzes', {
    token: tokens.professor,
    body: quizData,
  });
  if (assertStatus(createRes, 201, 'POST /api/quizzes (create quiz)')) {
    testQuizId = createRes.data?.quiz?._id;
    assert(!!testQuizId, '  Quiz ID returned', testQuizId);
    assert(createRes.data?.quiz?.questions?.length === 3, '  3 questions created', `${createRes.data?.quiz?.questions?.length} questions`);
  }

  // 5b. List quizzes
  const listRes = await request('GET', '/api/quizzes', { token: tokens.student });
  assertStatus(listRes, 200, 'GET /api/quizzes (list)');
  assert(Array.isArray(listRes.data?.quizzes), '  Returns quizzes array', `${listRes.data?.quizzes?.length} quizzes`);

  // 5c. Filter by course
  const filterRes = await request('GET', `/api/quizzes?course=${courseId}`, { token: tokens.student });
  assertStatus(filterRes, 200, 'GET /api/quizzes?course=<id>');

  // 5d. Get single quiz (student — answers hidden)
  if (testQuizId) {
    const getRes = await request('GET', `/api/quizzes/${testQuizId}`, { token: tokens.student });
    assertStatus(getRes, 200, 'GET /api/quizzes/:id (student view)');
    // correctAnswer should be hidden for students
    const q = getRes.data?.quiz?.questions?.[0];
    assert(!q?.correctAnswer, '  correctAnswer hidden from student', q?.correctAnswer ? 'EXPOSED!' : 'hidden');
  }

  // 5e. Get single quiz (professor — answers visible)
  if (testQuizId) {
    const getRes = await request('GET', `/api/quizzes/${testQuizId}`, { token: tokens.professor });
    assertStatus(getRes, 200, 'GET /api/quizzes/:id (professor view)');
  }

  // 5f. Submit quiz (student)
  if (testQuizId) {
    // Get the quiz to find question IDs
    const quizRes = await request('GET', `/api/quizzes/${testQuizId}`, { token: tokens.professor });
    const questions = quizRes.data?.quiz?.questions || [];

    const answers = questions.map((q) => ({
      questionId: q._id,
      answer: q.type === 'mcq' ? (q.correctAnswer || q.options?.[0]) : 'MVC separates concerns into Model, View, and Controller.',
    }));

    const submitRes = await request('POST', `/api/quizzes/${testQuizId}/submit`, {
      token: tokens.student,
      body: { answers },
    });
    assertStatus(submitRes, 201, 'POST /api/quizzes/:id/submit (student submit)');
    if (submitRes.data?.result) {
      assert(submitRes.data.result.totalScore >= 0, '  Score calculated', `score=${submitRes.data.result.totalScore}/${submitRes.data.result.maxScore}`);
    }
  }

  // 5g. Duplicate submission rejected
  if (testQuizId) {
    const dupRes = await request('POST', `/api/quizzes/${testQuizId}/submit`, {
      token: tokens.student,
      body: { answers: [] },
    });
    assert(dupRes.status >= 400, 'Duplicate quiz submission rejected', `${dupRes.status}`);
  }

  // 5h. Get results (student sees own)
  if (testQuizId) {
    const resStudent = await request('GET', `/api/quizzes/${testQuizId}/results`, { token: tokens.student });
    assertStatus(resStudent, 200, 'GET /api/quizzes/:id/results (student)');
  }

  // 5i. Get results (professor sees all)
  if (testQuizId) {
    const resProf = await request('GET', `/api/quizzes/${testQuizId}/results`, { token: tokens.professor });
    assertStatus(resProf, 200, 'GET /api/quizzes/:id/results (professor)');
  }

  // 5j. Update quiz
  if (testQuizId) {
    const updRes = await request('PUT', `/api/quizzes/${testQuizId}`, {
      token: tokens.professor,
      body: { title: 'API Test Quiz Updated' },
    });
    assertStatus(updRes, 200, 'PUT /api/quizzes/:id (update title)');
  }

  // 5k. Student cannot create quiz
  const studentQuiz = await request('POST', '/api/quizzes', {
    token: tokens.student,
    body: { title: 'Hack', course: courseId, questions: [] },
  });
  assert(studentQuiz.status === 403, 'Student cannot POST /api/quizzes → 403', `${studentQuiz.status}`);

  // 5l. Unauthenticated
  const noAuth = await request('GET', '/api/quizzes');
  assert(noAuth.status === 401, 'GET /api/quizzes without token → 401', `${noAuth.status}`);
}

// ── ADMIN: stats & reports ──────────────────────────────────
async function testAdminStats() {
  section('6. Admin Stats & Reports');

  if (!tokens.admin) { skip('Admin stats', 'No admin token'); return; }

  // 6a. Dashboard stats
  const statsRes = await request('GET', '/api/admin/stats', { token: tokens.admin });
  assertStatus(statsRes, 200, 'GET /api/admin/stats');
  const s = statsRes.data?.stats || statsRes.data;
  assert(typeof s?.totalUsers === 'number', '  totalUsers is number', `${s?.totalUsers}`);
  assert(typeof s?.totalCourses === 'number', '  totalCourses is number', `${s?.totalCourses}`);
  assert(typeof s?.totalLectures === 'number', '  totalLectures is number', `${s?.totalLectures}`);

  // 6b. Reports
  const repRes = await request('GET', '/api/admin/reports', { token: tokens.admin });
  assertStatus(repRes, 200, 'GET /api/admin/reports');
  assert(Array.isArray(repRes.data?.topStudents), '  topStudents array', `${repRes.data?.topStudents?.length} students`);

  // 6c. Student cannot access stats
  const studStats = await request('GET', '/api/admin/stats', { token: tokens.student });
  assert(studStats.status === 403, 'Student cannot GET /api/admin/stats → 403', `${studStats.status}`);

  // 6d. Professor cannot access stats (unless they have admin role)
  const profStats = await request('GET', '/api/admin/stats', { token: tokens.professor });
  assert(profStats.status === 403, 'Professor cannot GET /api/admin/stats → 403', `${profStats.status}`);
}

// ── ADMIN: institutions CRUD ────────────────────────────────
let testInstitutionId = null;

async function testAdminInstitutions() {
  section('7. Admin — Institutions CRUD');

  if (!tokens.admin) { skip('Institution tests', 'No admin token'); return; }

  // Create
  const createRes = await request('POST', '/api/admin/institutions', {
    token: tokens.admin,
    body: { name: 'Test Institute', code: 'TI', address: '123 Test St' },
  });
  if (assertStatus(createRes, 201, 'POST /api/admin/institutions')) {
    testInstitutionId = createRes.data?.institution?._id;
    assert(!!testInstitutionId, '  Institution ID returned', testInstitutionId);
  }

  // List
  const listRes = await request('GET', '/api/admin/institutions', { token: tokens.admin });
  assertStatus(listRes, 200, 'GET /api/admin/institutions');
  assert(Array.isArray(listRes.data?.institutions), '  Returns array', `${listRes.data?.institutions?.length} institutions`);

  // Update
  if (testInstitutionId) {
    const updRes = await request('PUT', `/api/admin/institutions/${testInstitutionId}`, {
      token: tokens.admin,
      body: { name: 'Test Institute Updated' },
    });
    assertStatus(updRes, 200, 'PUT /api/admin/institutions/:id');
  }

  // Student cannot access
  const studRes = await request('GET', '/api/admin/institutions', { token: tokens.student });
  assert(studRes.status === 403, 'Student cannot GET institutions → 403', `${studRes.status}`);
}

// ── ADMIN: departments CRUD ─────────────────────────────────
let testDepartmentId = null;

async function testAdminDepartments() {
  section('8. Admin — Departments CRUD');

  if (!tokens.admin) { skip('Department tests', 'No admin token'); return; }

  // Need an institution ID
  const instId = testInstitutionId;
  if (!instId) { skip('Department create', 'No test institution'); return; }

  // Create
  const createRes = await request('POST', '/api/admin/departments', {
    token: tokens.admin,
    body: { name: 'Test Department', code: 'TD', institution: instId },
  });
  if (assertStatus(createRes, 201, 'POST /api/admin/departments')) {
    testDepartmentId = createRes.data?.department?._id;
    assert(!!testDepartmentId, '  Department ID returned', testDepartmentId);
  }

  // List
  const listRes = await request('GET', '/api/admin/departments', { token: tokens.admin });
  assertStatus(listRes, 200, 'GET /api/admin/departments');

  // Filter by institution
  const filterRes = await request('GET', `/api/admin/departments?institution=${instId}`, { token: tokens.admin });
  assertStatus(filterRes, 200, 'GET /api/admin/departments?institution=<id>');

  // Update
  if (testDepartmentId) {
    const updRes = await request('PUT', `/api/admin/departments/${testDepartmentId}`, {
      token: tokens.admin,
      body: { name: 'Test Department Updated' },
    });
    assertStatus(updRes, 200, 'PUT /api/admin/departments/:id');
  }
}

// ── ADMIN: courses CRUD ─────────────────────────────────────
let testCourseId = null;

async function testAdminCourses() {
  section('9. Admin — Courses CRUD');

  if (!tokens.admin) { skip('Admin course tests', 'No admin token'); return; }

  const deptId = testDepartmentId;
  if (!deptId) { skip('Admin course create', 'No test department'); return; }

  // Create
  const createRes = await request('POST', '/api/admin/courses', {
    token: tokens.admin,
    body: { name: 'Test Course', code: `TC${Date.now()}`, department: deptId, semester: 3 },
  });
  if (assertStatus(createRes, 201, 'POST /api/admin/courses')) {
    testCourseId = createRes.data?.course?._id;
    assert(!!testCourseId, '  Course ID returned', testCourseId);
  }

  // List
  const listRes = await request('GET', '/api/admin/courses', { token: tokens.admin });
  assertStatus(listRes, 200, 'GET /api/admin/courses');

  // Filter by department
  const filterRes = await request('GET', `/api/admin/courses?department=${deptId}`, { token: tokens.admin });
  assertStatus(filterRes, 200, 'GET /api/admin/courses?department=<id>');

  // Update
  if (testCourseId) {
    const updRes = await request('PUT', `/api/admin/courses/${testCourseId}`, {
      token: tokens.admin,
      body: { name: 'Test Course Updated' },
    });
    assertStatus(updRes, 200, 'PUT /api/admin/courses/:id');
  }

  // Student cannot access admin courses
  const studRes = await request('GET', '/api/admin/courses', { token: tokens.student });
  assert(studRes.status === 403, 'Student cannot GET /api/admin/courses → 403', `${studRes.status}`);
}

// ── ADMIN: users ────────────────────────────────────────────
let testUserId = null;

async function testUsers() {
  section('10. Users Management (Admin)');

  if (!tokens.admin) { skip('User management tests', 'No admin token'); return; }

  // Create
  const createRes = await request('POST', '/api/users', {
    token: tokens.admin,
    body: { email: `testuser_${Date.now()}@test.com`, password: 'test123456', name: 'API Test User', role: 'student' },
  });
  if (assertStatus(createRes, 201, 'POST /api/users (create user)')) {
    testUserId = createRes.data?.user?._id;
    assert(!!testUserId, '  User ID returned', testUserId);
  }

  // List
  const listRes = await request('GET', '/api/users', { token: tokens.admin });
  assertStatus(listRes, 200, 'GET /api/users (list)');
  assert(Array.isArray(listRes.data?.users), '  Returns users array', `${listRes.data?.users?.length} users`);

  // Filter by role
  const filterRes = await request('GET', '/api/users?role=student', { token: tokens.admin });
  assertStatus(filterRes, 200, 'GET /api/users?role=student');

  // Search
  const searchRes = await request('GET', '/api/users?search=API+Test', { token: tokens.admin });
  assertStatus(searchRes, 200, 'GET /api/users?search=API+Test');

  // Get by ID
  if (testUserId) {
    const getRes = await request('GET', `/api/users/${testUserId}`, { token: tokens.admin });
    assertStatus(getRes, 200, 'GET /api/users/:id');
  }

  // Update
  if (testUserId) {
    const updRes = await request('PUT', `/api/users/${testUserId}`, {
      token: tokens.admin,
      body: { name: 'API Test User Updated', role: 'professor' },
    });
    assertStatus(updRes, 200, 'PUT /api/users/:id (update name & role)');
  }

  // Student cannot access
  const studRes = await request('GET', '/api/users', { token: tokens.student });
  assert(studRes.status === 403, 'Student cannot GET /api/users → 403', `${studRes.status}`);

  // Professor cannot access
  const profRes = await request('GET', '/api/users', { token: tokens.professor });
  assert(profRes.status === 403, 'Professor cannot GET /api/users → 403', `${profRes.status}`);
}

// ── CLEANUP ─────────────────────────────────────────────────
async function cleanup() {
  section('11. Cleanup (delete test data)');

  if (!tokens.admin) { skip('Cleanup', 'No admin token'); return; }

  // Delete test quiz
  if (testQuizId) {
    const r = await request('DELETE', `/api/quizzes/${testQuizId}`, { token: tokens.professor });
    assert(r.status === 200 || r.status === 204, 'DELETE test quiz', `${r.status}`);
  }

  // Delete test lecture
  if (testLectureId) {
    const r = await request('DELETE', `/api/lectures/${testLectureId}`, { token: tokens.professor });
    assert(r.status === 200 || r.status === 204, 'DELETE test lecture', `${r.status}`);
  }

  // Delete test course
  if (testCourseId) {
    const r = await request('DELETE', `/api/admin/courses/${testCourseId}`, { token: tokens.admin });
    assert(r.status === 200 || r.status === 204, 'DELETE test course', `${r.status}`);
  }

  // Delete test department
  if (testDepartmentId) {
    const r = await request('DELETE', `/api/admin/departments/${testDepartmentId}`, { token: tokens.admin });
    assert(r.status === 200 || r.status === 204, 'DELETE test department', `${r.status}`);
  }

  // Delete test institution
  if (testInstitutionId) {
    const r = await request('DELETE', `/api/admin/institutions/${testInstitutionId}`, { token: tokens.admin });
    assert(r.status === 200 || r.status === 204, 'DELETE test institution', `${r.status}`);
  }

  // Delete test user
  if (testUserId) {
    const r = await request('DELETE', `/api/users/${testUserId}`, { token: tokens.admin });
    assert(r.status === 200 || r.status === 204, 'DELETE test user', `${r.status}`);
  }
}

// ── BONUS: edge cases ───────────────────────────────────────
async function testEdgeCases() {
  section('12. Edge Cases & Security');

  // Invalid ObjectId
  const badId = await request('GET', '/api/lectures/invalidid123', { token: tokens.student });
  assert(badId.status >= 400, 'Invalid ObjectId → 4xx/5xx', `${badId.status}`);

  // Non-existent resource
  const noRes = await request('GET', '/api/lectures/aaaaaaaaaaaaaaaaaaaaaaaa', { token: tokens.student });
  assert(noRes.status >= 400, 'Non-existent lecture → 4xx', `${noRes.status}`);

  // Unknown route
  const noRoute = await request('GET', '/api/nonexistent', { token: tokens.admin });
  assert(noRoute.status === 404 || noRoute.status >= 400, 'Unknown route → 4xx', `${noRoute.status}`);

  // Expired/invalid token
  const badToken = await request('GET', '/api/auth/profile', {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZha2UiLCJpYXQiOjE2MDAwMDAwMDB9.fakesig',
  });
  assert(badToken.status === 401, 'Invalid JWT → 401', `${badToken.status}`);

  // Admin cannot delete self
  if (tokens.admin && userIds.admin) {
    const selfDel = await request('DELETE', `/api/users/${userIds.admin}`, { token: tokens.admin });
    assert(selfDel.status >= 400, 'Admin cannot delete self', `${selfDel.status}`);
  }

  // DeptAdmin role has admin access
  if (tokens.deptAdmin) {
    const daStats = await request('GET', '/api/admin/stats', { token: tokens.deptAdmin });
    assertStatus(daStats, 200, 'dept_admin can access /api/admin/stats');
  }
}

// ─────────────────────────────────────────────────────────────
//  MAIN RUNNER
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${colors.bold}${colors.magenta}╔══════════════════════════════════════════════════════════╗`);
  console.log(`║   AI-Based Multilingual Lecture System — API Test Suite  ║`);
  console.log(`╚══════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log(`${colors.dim}  Target: ${API_URL}${colors.reset}`);
  console.log(`${colors.dim}  Time:   ${new Date().toISOString()}${colors.reset}`);

  const start = Date.now();

  try {
    await testHealth();
    await testAuth();
    await testCourses();
    await testLectures();
    await testQuizzes();
    await testAdminStats();
    await testAdminInstitutions();
    await testAdminDepartments();
    await testAdminCourses();
    await testUsers();
    await testEdgeCases();
    await cleanup();
  } catch (err) {
    console.error(`\n${colors.red}FATAL ERROR: ${err.message}${colors.reset}`);
    console.error(err.stack);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(2);

  // Summary
  console.log(`\n${colors.bold}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}  RESULTS${colors.reset}  ${colors.dim}(${elapsed}s)${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`  ${colors.green}Passed:  ${passed}${colors.reset}`);
  if (failed > 0) console.log(`  ${colors.red}Failed:  ${failed}${colors.reset}`);
  if (skipped > 0) console.log(`  ${colors.yellow}Skipped: ${skipped}${colors.reset}`);
  console.log(`  Total:   ${passed + failed + skipped}`);

  if (failures.length > 0) {
    console.log(`\n${colors.red}${colors.bold}  Failed Tests:${colors.reset}`);
    failures.forEach((f, i) => {
      console.log(`  ${colors.red}${i + 1}. ${f.name}${colors.reset}`);
      console.log(`     ${colors.dim}${f.reason}${colors.reset}`);
    });
  }

  const total = passed + failed;
  const pct = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
  const bar = total > 0
    ? colors.green + '█'.repeat(Math.round(passed / total * 30)) + colors.red + '█'.repeat(Math.round(failed / total * 30)) + colors.reset
    : '';
  console.log(`\n  ${bar}  ${pct}%`);

  console.log(`\n${failed === 0 ? colors.green + '  ✅ All tests passed!' : colors.red + '  ❌ Some tests failed.'}${colors.reset}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main();
