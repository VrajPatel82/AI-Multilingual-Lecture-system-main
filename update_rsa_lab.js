const mongoose = require('mongoose');
require('dotenv').config();
const Lecture = require('./backend/models/Lecture');

const DUMMY_VIDEO = 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4';
const DUMMY_PDF = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

async function updateRSA() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const result = await Lecture.findOneAndUpdate(
      { title: 'Lab: Implementing RSA Encryption' },
      { 
        fileUrl: DUMMY_VIDEO,
        fileType: 'video',
        fileName: 'rsa_tutorial.mp4',
        attachmentUrl: DUMMY_PDF,
        attachmentName: 'RSA_Lab_Manual.pdf'
      },
      { new: true }
    );

    if (result) {
      console.log('Successfully updated RSA Encryption lab');
      console.log('New data:', JSON.stringify(result, null, 2));
    } else {
      console.log('RSA Encryption lab not found');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error updating RSA Encryption lab:', err);
    process.exit(1);
  }
}

updateRSA();
