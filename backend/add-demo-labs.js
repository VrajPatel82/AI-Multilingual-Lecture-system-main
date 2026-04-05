#!/usr/bin/env node

/**
 * =========================================================
 *  Add Demo Lab Sessions for AI, ML, CC, and TOC
 * =========================================================
 *  Creates demo lab sessions for both student and professor UI testing
 *
 *  Run: cd backend && node add-demo-labs.js
 * =========================================================
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Course = require('./models/Course');
const Lecture = require('./models/Lecture');
const User = require('./models/User');
const Department = require('./models/Department');
const Institution = require('./models/Institution');

const DUMMY_PDF = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

const seedLabs = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Get IITB CSE Department
    const iitbCseDept = await Department.findOne({ code: 'CSE' }).populate('institution').exec();
    if (!iitbCseDept) {
      console.error('❌ IITB CSE Department not found. Please run seed.js first.');
      process.exit(1);
    }

    console.log('Creating/Updating AI and TOC courses...');

    // Create or update AI course
    let aiCourse = await Course.findOne({ code: 'CS303' });
    if (!aiCourse) {
      aiCourse = await Course.create({
        name: 'Artificial Intelligence',
        code: 'CS303',
        department: iitbCseDept._id,
        semester: 5
      });
      console.log('  ✓ Created AI course');
    } else {
      console.log('  ✓ AI course already exists');
    }

    // Create or update TOC course
    let tocCourse = await Course.findOne({ code: 'CS304' });
    if (!tocCourse) {
      tocCourse = await Course.create({
        name: 'Theory of Computation',
        code: 'CS304',
        department: iitbCseDept._id,
        semester: 4
      });
      console.log('  ✓ Created TOC course');
    } else {
      console.log('  ✓ TOC course already exists');
    }

    // Get existing courses
    const mlCourse = await Course.findOne({ code: 'CS301' });
    const ccCourse = await Course.findOne({ code: 'DCS401' });

    if (!mlCourse) {
      console.error('❌ ML Course (CS301) not found. Please run seed.js first.');
      process.exit(1);
    }
    if (!ccCourse) {
      console.error('❌ CC Course (DCS401) not found. Please run seed.js first.');
      process.exit(1);
    }

    // Get a professor user
    const professor = await User.findOne({ role: 'professor' });
    if (!professor) {
      console.error('❌ Professor not found. Please run seed.js first.');
      process.exit(1);
    }

    console.log('\nCreating demo lab sessions...\n');

    // AI Labs
    console.log('AI Labs:');
    const aiLabs = [
      {
        title: 'AI Lab 1: Problem Solving with Search Algorithms',
        description: 'Implement BFS, DFS, and A* search algorithms for maze solving and pathfinding problems.',
        subject: 'Search Algorithms',
        experimentTitle: 'Maze Solver using Different Search Techniques',
        course: aiCourse._id,
        semester: 5
      },
      {
        title: 'AI Lab 2: Game Playing with Minimax Algorithm',
        description: 'Implement Minimax algorithm for game theory. Build a Tic-Tac-Toe AI player.',
        subject: 'Game Theory',
        experimentTitle: 'Tic-Tac-Toe Game with Minimax AI',
        course: aiCourse._id,
        semester: 5
      },
      {
        title: 'AI Lab 3: Expert Systems and Rule Engines',
        description: 'Design and implement expert systems using forward and backward chaining inference engines.',
        subject: 'Expert Systems',
        experimentTitle: 'Medical Diagnosis Expert System',
        course: aiCourse._id,
        semester: 5
      },
    ];

    for (const lab of aiLabs) {
      const existing = await Lecture.findOne({ 
        title: lab.title, 
        type: 'lab',
        course: lab.course 
      });
      if (!existing) {
        await Lecture.create({
          ...lab,
          type: 'lab',
          fileUrl: DUMMY_PDF,
          fileType: 'pdf',
          fileName: 'ai_lab.pdf',
          uploadedBy: professor._id,
          language: 'en'
        });
        console.log(`  ✓ ${lab.title}`);
      } else {
        console.log(`  ~ ${lab.title} (already exists)`);
      }
    }

    // ML Labs
    console.log('\nML Labs:');
    const mlLabs = [
      {
        title: 'ML Lab 1: Data Preprocessing and Visualization',
        description: 'Learn data cleaning, normalization, and visualization techniques using pandas and matplotlib.',
        subject: 'Data Preprocessing',
        experimentTitle: 'Iris Dataset Preprocessing and EDA',
        course: mlCourse._id,
        semester: 5
      },
      {
        title: 'ML Lab 2: Supervised Learning Implementations',
        description: 'Implement Linear Regression, Logistic Regression, and Decision Trees from scratch.',
        subject: 'Supervised Learning',
        experimentTitle: 'Building Classification Models',
        course: mlCourse._id,
        semester: 5
      },
      {
        title: 'ML Lab 3: Clustering Algorithms',
        description: 'Implement K-Means, DBSCAN, and hierarchical clustering. Analyze cluster quality metrics.',
        subject: 'Unsupervised Learning',
        experimentTitle: 'Customer Segmentation using Clustering',
        course: mlCourse._id,
        semester: 5
      },
      {
        title: 'ML Lab 4: Neural Networks with TensorFlow',
        description: 'Build and train neural networks for image classification using TensorFlow and Keras.',
        subject: 'Deep Learning',
        experimentTitle: 'MNIST Digit Classification',
        course: mlCourse._id,
        semester: 5
      },
    ];

    for (const lab of mlLabs) {
      const existing = await Lecture.findOne({ 
        title: lab.title, 
        type: 'lab',
        course: lab.course 
      });
      if (!existing) {
        await Lecture.create({
          ...lab,
          type: 'lab',
          fileUrl: DUMMY_PDF,
          fileType: 'pdf',
          fileName: 'ml_lab.pdf',
          uploadedBy: professor._id,
          language: 'en'
        });
        console.log(`  ✓ ${lab.title}`);
      } else {
        console.log(`  ~ ${lab.title} (already exists)`);
      }
    }

    // Cloud Computing Labs
    console.log('\nCloud Computing (CC) Labs:');
    const ccLabs = [
      {
        title: 'CC Lab 1: Virtual Machines and Infrastructure Setup',
        description: 'Set up virtual machines on AWS EC2. Configure security groups, key pairs, and network settings.',
        subject: 'IaaS',
        experimentTitle: 'AWS EC2 Instance Management',
        course: ccCourse._id,
        semester: 8
      },
      {
        title: 'CC Lab 2: Containerization with Docker',
        description: 'Create Docker containers for a multi-tier application. Build and share container images.',
        subject: 'Containerization',
        experimentTitle: 'Docker Application Deployment',
        course: ccCourse._id,
        semester: 8
      },
      {
        title: 'CC Lab 3: Kubernetes Orchestration',
        description: 'Deploy containerized applications on Kubernetes. Configure pods, services, and ingress.',
        subject: 'Container Orchestration',
        experimentTitle: 'Kubernetes Deployment and Scaling',
        course: ccCourse._id,
        semester: 8
      },
      {
        title: 'CC Lab 4: Serverless Computing with AWS Lambda',
        description: 'Build serverless functions with AWS Lambda. Create APIs using API Gateway and Lambda.',
        subject: 'Serverless',
        experimentTitle: 'Event-Driven Serverless Application',
        course: ccCourse._id,
        semester: 8
      },
    ];

    for (const lab of ccLabs) {
      const existing = await Lecture.findOne({ 
        title: lab.title, 
        type: 'lab',
        course: lab.course 
      });
      if (!existing) {
        await Lecture.create({
          ...lab,
          type: 'lab',
          fileUrl: DUMMY_PDF,
          fileType: 'pdf',
          fileName: 'cc_lab.pdf',
          uploadedBy: professor._id,
          language: 'en'
        });
        console.log(`  ✓ ${lab.title}`);
      } else {
        console.log(`  ~ ${lab.title} (already exists)`);
      }
    }

    // Theory of Computation Labs
    console.log('\nTheory of Computation (TOC) Labs:');
    const tocLabs = [
      {
        title: 'TOC Lab 1: Finite Automata (DFA and NFA)',
        description: 'Design deterministic and non-deterministic finite automata for various languages.',
        subject: 'Automata Theory',
        experimentTitle: 'Building and Testing DFAs and NFAs',
        course: tocCourse._id,
        semester: 4
      },
      {
        title: 'TOC Lab 2: Regular Expressions and Lexical Analysis',
        description: 'Write regular expressions and build a lexer using finite automata concepts.',
        subject: 'Lexical Analysis',
        experimentTitle: 'Lexer Implementation for a Simple Language',
        course: tocCourse._id,
        semester: 4
      },
    ];

    for (const lab of tocLabs) {
      const existing = await Lecture.findOne({ 
        title: lab.title, 
        type: 'lab',
        course: lab.course 
      });
      if (!existing) {
        await Lecture.create({
          ...lab,
          type: 'lab',
          fileUrl: DUMMY_PDF,
          fileType: 'pdf',
          fileName: 'toc_lab.pdf',
          uploadedBy: professor._id,
          language: 'en'
        });
        console.log(`  ✓ ${lab.title}`);
      }
    }

    // Creating Semester 6 Labs (since user is in Sem 6)
    console.log('\nSemester 6 Labs:');
    const sem6Labs = [
      {
        title: 'Network Security Lab: Cryptography Basics',
        description: 'Implement symmetric and asymmetric encryption algorithms like DES, AES, and RSA.',
        subject: 'Network Security',
        experimentTitle: 'Implementing RSA Algorithm',
        course: mlCourse._id, // Use existing course for simplicity or create new one
        semester: 6
      },
      {
        title: 'Software Engineering Lab: UML Modeling',
        description: 'Design various UML diagrams including class, sequence, and activity diagrams for a system.',
        subject: 'Software Engineering',
        experimentTitle: 'UML Design for E-commerce System',
        course: mlCourse._id,
        semester: 6
      },
      {
        title: 'Data Science Lab: Statistical Modeling',
        description: 'Perform statistical analysis and hypothesis testing on real-world datasets using R/Python.',
        subject: 'Data Science',
        experimentTitle: 'Hypothesis Testing on Housing Data',
        course: mlCourse._id,
        semester: 6
      }
    ];

    for (const lab of sem6Labs) {
      const existing = await Lecture.findOne({ 
        title: lab.title, 
        type: 'lab',
        semester: 6
      });
      if (!existing) {
        await Lecture.create({
          ...lab,
          type: 'lab',
          fileUrl: DUMMY_PDF,
          fileType: 'pdf',
          fileName: 'sem6_lab.pdf',
          uploadedBy: professor._id,
          language: 'en'
        });
        console.log(`  ✓ ${lab.title}`);
      }
    }

    console.log('\n✅ Demo labs created successfully!\n');
    console.log('Summary:');
    console.log('  • AI Labs: 3 sessions');
    console.log('  • ML Labs: 4 sessions');
    console.log('  • CC Labs: 4 sessions');
    console.log('  • TOC Labs: 4 sessions');
    console.log('  Total: 15 demo lab sessions\n');
    console.log('Courses created:');
    console.log('  • Artificial Intelligence (CS303) - Semester 5');
    console.log('  • Theory of Computation (CS304) - Semester 4');
    console.log('\nThese labs are now visible to:');
    console.log('  ✓ Professors (can view and manage)');
    console.log('  ✓ Students (can access based on current semester)\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

seedLabs();
