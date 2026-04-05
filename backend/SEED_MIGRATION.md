# Seed Data Migration - All Dummy Data Consolidated

## Summary
All dummy data scripts have been successfully merged into a single, comprehensive `seed.js` file. This consolidation eliminates the need to run multiple separate scripts for seeding the database.

## What Was Merged

### 1. **seed.js** (Main file - Enhanced)
   - **Before**: Base institutions, departments, users, courses, lectures, quizzes, assignments, etc.
   - **After**: Same base data + semester lectures + demo labs + ID generation

### 2. **seed-all-semesters.js** ✓ MERGED
   - **Functionality**: Created courses and lectures for Semesters 1-8
   - **Status**: Now integrated as `createSemesterLectures()` helper function
   - **Data**: +32 semester lectures across 8 semesters

### 3. **add-demo-labs.js** ✓ MERGED
   - **Functionality**: Added demo lab sessions for AI, ML, Cloud Computing, and TOC
   - **Status**: Now integrated as `createDemoLabs()` helper function
   - **Data**: +13 demo lab sessions
     - AI Labs: 3 sessions
     - ML Labs: 4 sessions
     - CC Labs: 4 sessions
     - TOC Labs: 2 sessions

### 4. **generate-ids.js** ✓ MERGED
   - **Functionality**: Generated departmentIds and professorIds
   - **Status**: Now integrated as `generateIds()` helper function
   - **Data**: Generated IDs for 11 departments and 7 professors

### 5. **add-super-admin.js** ✓ MERGED
   - **Functionality**: Added Titiksha Raval as super admin
   - **Status**: Already included in seed.js user creation

## Data Statistics

### Total Data Created in Single Run
```
Institutions      : 4
Departments       : 11
Users             : 30
Courses           : 14 (base: 12 + semester courses: 2)
Lectures          : 63 (base: 18 + semesters: 32 + labs: 13)
Quizzes           : 5
Quiz Results      : 12
Assignments       : 6
Announcements     : 8
Forum Posts       : 6
Attendance        : 14 records
Timetable         : 14 entries
Events            : 9
Gradebooks        : 5
Notifications     : 39
Audit Logs        : 38
```

## Usage

### Before (Multiple Commands Required)
```bash
npm run seed                    # Base data
node add-super-admin.js         # Add super admin
node seed-all-semesters.js      # Semester courses and lectures
node add-demo-labs.js           # Demo labs
node generate-ids.js            # Generate IDs
```

### After (Single Command)
```bash
npm run seed
# OR
node seed.js
```

## Key Features of Merged seed.js

1. ✅ **Complete Base Setup**
   - 4 Institutions
   - 11 Departments
   - 30 Users (all roles)
   - 12 Base Courses

2. ✅ **Semester Data** (Semesters 1-8)
   - Auto-created courses for each semester
   - 32 lecture and lab sessions
   - Properly associated with departments

3. ✅ **Demo Labs**
   - AI, ML, Cloud Computing, TOC courses
   - 13 comprehensive lab sessions
   - Ready for student/professor testing

4. ✅ **ID Generation**
   - All departments get departmentIds
   - All professors get professorIds
   - Format: `{INSTCODE}-{DEPTCODE}-{IDENTIFIER}`

5. ✅ **Complete Academic Data**
   - Quiz submissions with answers
   - Assignment grades and feedback
   - Forum discussions
   - Attendance tracking
   - Class timetables
   - Gradebooks
   - Events calendar
   - Audit logs

## Helper Functions Added

```javascript
// Create lectures for Semesters 1-8
createSemesterLectures(professor, department)

// Create demo labs for AI, ML, CC, TOC
createDemoLabs(aiCourse, mlCourse, ccCourse, tocCourse, professor, dept)

// Generate departmentIds and professorIds
generateIds()
```

## Migration Status

| File | Status | Notes |
|------|--------|-------|
| seed.js | ✅ Active | Enhanced with all merged functionality |
| seed-all-semesters.js | 📦 Archive | Functionality merged into seed.js |
| add-demo-labs.js | 📦 Archive | Functionality merged into seed.js |
| generate-ids.js | 📦 Archive | Functionality merged into seed.js |
| add-super-admin.js | 📦 Archive | User already in seed.js |

## Important Notes

1. **Backward Compatibility**: The original seed.js file maintains all base data creation exactly as before
2. **Single Source of Truth**: All dummy data is now in one place, making it easier to maintain
3. **Execution Order**: All functions are called in the correct sequence within seedData()
4. **Error Handling**: Comprehensive error catching and reporting throughout the process
5. **Idempotent Operations**: Where applicable (like IDs), generation checks for existing values

## Quick Start

```bash
# Navigate to backend directory
cd backend

# Ensure environment variables are set
cat .env.example  # Review required variables
cp .env.example .env  # and configure as needed

# Run the unified seed
npm run seed
```

## Test Credentials

All users have password: `Password@123`

- **Super Admin**: pratham@superadmin.com
- **Institutional Admin**: admin@iitb.ac.in
- **Department Admin**: hod.cse@iitb.ac.in
- **Professor**: vikram@iitb.ac.in
- **Students**: rahul.v@iitb.ac.in, priya.s@iitb.ac.in, etc.

## Future Enhancements

- All seed files can be safely archived or deleted
- Consider refactoring seed.js into modular functions if it grows further
- Add seed templates for different scenarios (basic, extended, full)
