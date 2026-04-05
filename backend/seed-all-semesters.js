const mongoose = require('mongoose');
require('dotenv').config();

const Course = require('./models/Course');
const Lecture = require('./models/Lecture');
const User = require('./models/User');
const Department = require('./models/Department');

const DUMMY_PDF = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
const DUMMY_VIDEO = 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4';

const semesterData = [
  {
    semester: 1,
    courses: [
      { name: 'Introduction to C Programming', code: 'CS101' },
      { name: 'Digital Logic & Design', code: 'CS102' }
    ],
    items: [
      { title: 'Basics of C: Variables and Types', type: 'lecture', subject: 'C Programming' },
      { title: 'Lab: Basic IO and Operators in C', type: 'lab', subject: 'C Programming', experimentTitle: 'Input/Output Operations' },
      { title: 'Boolean Algebra and Logic Gates', type: 'lecture', subject: 'Digital Logic' },
      { title: 'Lab: Implementation of Logic Gates', type: 'lab', subject: 'Digital Logic', experimentTitle: 'Basic Logic Gates' }
    ]
  },
  {
    semester: 2,
    courses: [
      { name: 'Object Oriented Programming with Java', code: 'CS201' },
      { name: 'Data Structures', code: 'CS202' }
    ],
    items: [
      { title: 'Classes and Objects in Java', type: 'lecture', subject: 'OOP' },
      { title: 'Lab: Inheritance and Polymorphism', type: 'lab', subject: 'OOP', experimentTitle: 'Class Hierarchy' },
      { title: 'Linked Lists and Stacks', type: 'lecture', subject: 'Data Structures' },
      { title: 'Lab: Doubly Linked List Implementation', type: 'lab', subject: 'Data Structures', experimentTitle: 'Linked List Operations' }
    ]
  },
  {
    semester: 3,
    courses: [
      { name: 'Computer Organization & Architecture', code: 'CS301' },
      { name: 'Discrete Mathematics', code: 'MA301' }
    ],
    items: [
      { title: 'CPU Architecture and Instruction Set', type: 'lecture', subject: 'Computer Architecture' },
      { title: 'Lab: Assembly Language Programming', type: 'lab', subject: 'Computer Architecture', experimentTitle: '8085 Instructions' },
      { title: 'Set Theory and Relations', type: 'lecture', subject: 'Discrete Maths' },
      { title: 'Lab: Graph Theory Visualizer', type: 'lab', subject: 'Discrete Maths', experimentTitle: 'Shortest Path Visualizer' }
    ]
  },
  {
    semester: 4,
    courses: [
      { name: 'Operating Systems', code: 'CS401' },
      { name: 'Theory of Computation', code: 'CS402' }
    ],
    items: [
      { title: 'Process Scheduling Algorithms', type: 'lecture', subject: 'OS' },
      { title: 'Lab: Round Robin Scheduling implementation', type: 'lab', subject: 'OS', experimentTitle: 'CPU Scheduling' },
      { title: 'Finite Automata and Regular Languages', type: 'lecture', subject: 'TOC' },
      { title: 'Lab: NFA to DFA Conversion', type: 'lab', subject: 'TOC', experimentTitle: 'Automata Conversion' }
    ]
  },
  {
    semester: 5,
    courses: [
      { name: 'Artificial Intelligence', code: 'CS501' },
      { name: 'Database Management Systems', code: 'CS502' }
    ],
    items: [
      { title: 'Heuristic Search Techniques', type: 'lecture', subject: 'AI' },
      { title: 'Lab: A* Search Implementation', type: 'lab', subject: 'AI', experimentTitle: 'Pathfinding' },
      { title: 'Relational Model and Normalization', type: 'lecture', subject: 'DBMS' },
      { title: 'Lab: Complex SQL Queries and Joins', type: 'lab', subject: 'DBMS', experimentTitle: 'Database Schema Management' }
    ]
  },
  {
    semester: 6,
    courses: [
      { name: 'Software Engineering', code: 'CS601' },
      { name: 'Network Security', code: 'CS602' }
    ],
    items: [
      { title: 'Agile Methodologies and Scrum', type: 'lecture', subject: 'Software Engineering' },
      { title: 'Lab: SDLC Lifecycle Management', type: 'lab', subject: 'Software Engineering', experimentTitle: 'Project Planning' },
      { title: 'Cryptography and Public Key Infrastructure', type: 'lecture', subject: 'Security' },
      { title: 'Lab: Implementing RSA Encryption', type: 'lab', subject: 'Security', experimentTitle: 'Asymmetric Encryption' }
    ]
  },
  {
    semester: 7,
    courses: [
      { name: 'Compiler Design', code: 'CS701' },
      { name: 'Distributed Systems', code: 'CS702' }
    ],
    items: [
      { title: 'Lexical Analysis and Parsing', type: 'lecture', subject: 'Compilers' },
      { title: 'Lab: Building a Mini Parser', type: 'lab', subject: 'Compilers', experimentTitle: 'YACC Implementation' },
      { title: 'Distributed Consensus and Paxos', type: 'lecture', subject: 'Distributed Systems' },
      { title: 'Lab: MapReduce implementation in Java', type: 'lab', subject: 'Distributed Systems', experimentTitle: 'Data Parallel Processing' }
    ]
  },
  {
    semester: 8,
    courses: [
      { name: 'Cloud Computing', code: 'CS801' },
      { name: 'Professional Ethics', code: 'HU801' }
    ],
    items: [
      { title: 'Serverless Computing and Microservices', type: 'lecture', subject: 'Cloud' },
      { title: 'Lab: Deploying Microservices to Kubernetes', type: 'lab', subject: 'Cloud', experimentTitle: 'K8s Cluster Management' },
      { title: 'Ethical Hacking and Cybersecurity Laws', type: 'lecture', subject: 'Ethics' },
      { title: 'Lab: Penetration Testing Basics', type: 'lab', subject: 'Ethics', experimentTitle: 'Vulnerability Assessment' }
    ]
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const dept = await Department.findOne({ code: 'CSE' });
    if (!dept) {
      console.error('CSE Department not found. Run seed.js first.');
      process.exit(1);
    }

    const professor = await User.findOne({ role: 'professor' });
    if (!professor) {
      console.error('Professor not found. Run seed.js first.');
      process.exit(1);
    }

    console.log('Clearing existing demo data...');
    // We only clear demo data to avoid messing with real data
    // For safety in this environment, we'll just add new ones
    
    for (const sem of semesterData) {
      console.log(`Processing Semester ${sem.semester}...`);
      
      const courseIds = [];
      for (const courseInfo of sem.courses) {
        let course = await Course.findOne({ code: courseInfo.code });
        if (!course) {
          course = await Course.create({
            ...courseInfo,
            department: dept._id,
            semester: sem.semester
          });
          console.log(` - Created course: ${courseInfo.name}`);
        }
        courseIds.push(course._id);
      }

      for (let i = 0; i < sem.items.length; i++) {
        const item = sem.items[i];
        const existing = await Lecture.findOne({ title: item.title, type: item.type, semester: sem.semester });
        
        if (!existing) {
          await Lecture.create({
            ...item,
            description: `Comprehensive ${item.type} for Semester ${sem.semester} covering ${item.subject}. This material is designed for intermediate to advanced understanding level.`,
            semester: sem.semester,
            course: courseIds[i % courseIds.length],
            fileUrl: item.type === 'lecture' ? DUMMY_VIDEO : DUMMY_PDF,
            fileType: item.type === 'lecture' ? 'video' : 'pdf',
            fileName: item.type === 'lecture' ? 'lecture_video.mp4' : 'lab_manual.pdf',
            uploadedBy: professor._id,
            language: 'en'
          });
          console.log(`   ✓ Created ${item.type}: ${item.title}`);
        }
      }
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
