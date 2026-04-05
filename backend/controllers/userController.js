const User = require('../models/User');
const { paginate } = require('../utils/pagination');

// @desc    Get all users (admin only, or professor viewing their students, paginated)
// @route   GET /api/users?page=1&limit=20&role=student&search=keyword
exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, search, department, institution, page, limit } = req.query;
    const filter = {};

    // Professors can only view students
    if (req.user.role === 'professor') {
      filter.role = 'student';
      // Future: Add logic to filter students by professor's courses only
      // For now, professors see all students (can be restricted later)
    } else {
      // Admin roles can filter by any role
      if (role) filter.role = role;
      if (department) filter.department = department;
      if (institution) filter.institution = institution;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    console.log(`[DEBUG] User Role: ${req.user.role}, Filter:`, JSON.stringify(filter));

    const result = await paginate(User, filter, { page, limit }, [
      { path: 'institution', select: 'name code' },
      { path: 'department', select: 'name code' }
    ]);

    res.json({
      data: result.data,
      pagination: { total: result.pagination.totalItems, ...result.pagination }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('institution', 'name code')
      .populate('department', 'name code');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

// @desc    Create user (admin only)
// @route   POST /api/users
exports.createUser = async (req, res, next) => {
  try {
    const { email, password, name, role, institution, department } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const userData = {
      email,
      password,
      name,
      role,
      institution,
      department
    };

    // Generate professorId for professors
    if (role === 'professor' && institution && department) {
      const inst = await require('../models/Institution').findById(institution);
      const dept = await require('../models/Department').findById(department);
      
      if (inst && dept) {
        const instCode = inst.code || 'UNK';
        const deptCode = dept.code || 'UNK';
        
        // Count existing professors in this department
        const count = await User.countDocuments({
          role: 'professor',
          department: department
        });
        
        const sequence = String(count + 1).padStart(3, '0');
        userData.professorId = `${instCode}-${deptCode}-PROF-${sequence}`;
      }
    }

    // Generate enrollmentNumber for students
    if (role === 'student' && department) {
      const dept = await require('../models/Department').findById(department);
      const inst = await require('../models/Institution').findById(institution);
      
      if (dept && inst) {
        const instCode = inst.code || 'UNK';
        const deptCode = dept.code || 'UNK';
        
        // Find the last student in this department sorted by creation date
        const lastStudent = await User.findOne({
          role: 'student',
          department: department
        })
          .sort({ createdAt: -1 })
          .select('enrollmentNumber');
        
        let nextNumber = 1;
        if (lastStudent && lastStudent.enrollmentNumber) {
          // Extract numeric part from enrollment number (last 3 digits)
          const matches = lastStudent.enrollmentNumber.match(/(\d+)$/);
          if (matches) {
            nextNumber = parseInt(matches[1]) + 1;
          }
        }
        
        const sequence = String(nextNumber).padStart(3, '0');
        userData.enrollmentNumber = `${instCode}-${deptCode}-${sequence}`;
      }
    }

    const user = await User.create(userData);

    res.status(201).json({ user, message: 'User created successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user (admin only)
// @route   PUT /api/users/:id
exports.updateUser = async (req, res, next) => {
  try {
    const { name, role, institution, department, currentSemester } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (role) updates.role = role;
    if (institution) updates.institution = institution;
    if (department) updates.department = department;

    // Allow admins to update student semester
    if (currentSemester !== undefined) {
      updates.currentSemester = Math.min(8, Math.max(1, parseInt(currentSemester)));
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    })
      .populate('institution', 'name code')
      .populate('department', 'name code');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user, message: 'User updated successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Update student semester (dept admin only)
// @route   PUT /api/users/:id/update-semester
exports.updateStudentSemester = async (req, res, next) => {
  try {
    const { currentSemester } = req.body;

    if (currentSemester === undefined) {
      return res.status(400).json({ message: 'currentSemester is required' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'student') {
      return res.status(400).json({ message: 'Can only update semester for students' });
    }

    // Validate semester range
    const semester = Math.min(8, Math.max(1, parseInt(currentSemester)));

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { currentSemester: semester },
      { new: true, runValidators: true }
    )
      .populate('institution', 'name code')
      .populate('department', 'name code');

    res.json({ 
      user: updatedUser, 
      message: `Student semester updated to ${semester} successfully` 
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user (admin only)
// @route   DELETE /api/users/:id
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};
