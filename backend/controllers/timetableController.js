const Timetable = require('../models/Timetable');

// @desc    Create timetable entry
// @route   POST /api/timetable
exports.createEntry = async (req, res, next) => {
  try {
    const { course, professor, dayOfWeek, startTime, endTime, room, semester, department } = req.body;

    // Check for time conflicts in same room
    if (room) {
      const conflict = await Timetable.findOne({
        room,
        dayOfWeek,
        $or: [
          { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
        ]
      });
      if (conflict) {
        return res.status(400).json({ message: `Room ${room} has a conflict on ${dayOfWeek} at that time` });
      }
    }

    // Check for professor time conflicts
    const profConflict = await Timetable.findOne({
      professor,
      dayOfWeek,
      $or: [
        { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
      ]
    });
    if (profConflict) {
      return res.status(400).json({ message: 'Professor has a scheduling conflict at that time' });
    }

    const entry = await Timetable.create({
      course, professor, dayOfWeek, startTime, endTime, room, semester, department
    });

    await entry.populate('course', 'name code');
    await entry.populate('professor', 'name email');

    res.status(201).json({ entry, message: 'Timetable entry created successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get timetable entries (by filter)
// @route   GET /api/timetable
exports.getEntries = async (req, res, next) => {
  try {
    const { professor, course, department, semester, room, dayOfWeek } = req.query;
    const filter = {};

    if (professor) filter.professor = professor;
    if (course) {
      const courseIds = course.split(',').map(id => id.trim());
      filter.course = courseIds.length === 1 ? courseIds[0] : { $in: courseIds };
    }
    if (department) filter.department = department;
    if (semester) filter.semester = parseInt(semester);
    if (room) filter.room = room;
    if (dayOfWeek) filter.dayOfWeek = dayOfWeek;

    const entries = await Timetable.find(filter)
      .populate('course', 'name code')
      .populate('professor', 'name email')
      .populate('department', 'name code')
      .sort({ dayOfWeek: 1, startTime: 1 });

    // Group by day
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const schedule = {};
    days.forEach(day => {
      schedule[day] = entries.filter(e => e.dayOfWeek === day);
    });

    res.json({ data: entries, schedule });
  } catch (error) {
    next(error);
  }
};

// @desc    Update timetable entry
// @route   PUT /api/timetable/:id
exports.updateEntry = async (req, res, next) => {
  try {
    const { course, professor, dayOfWeek, startTime, endTime, room, semester, department } = req.body;

    // Check for room conflicts (excluding current entry)
    if (room && dayOfWeek && startTime && endTime) {
      const roomConflict = await Timetable.findOne({
        _id: { $ne: req.params.id },
        room,
        dayOfWeek,
        $or: [
          { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
        ]
      });
      if (roomConflict) {
        return res.status(400).json({ message: `Room ${room} has a conflict on ${dayOfWeek} at that time` });
      }
    }

    // Check for professor conflicts (excluding current entry)
    if (professor && dayOfWeek && startTime && endTime) {
      const profConflict = await Timetable.findOne({
        _id: { $ne: req.params.id },
        professor,
        dayOfWeek,
        $or: [
          { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
        ]
      });
      if (profConflict) {
        return res.status(400).json({ message: 'Professor has a scheduling conflict at that time' });
      }
    }

    const entry = await Timetable.findByIdAndUpdate(req.params.id, {
      course, professor, dayOfWeek, startTime, endTime, room, semester, department
    }, {
      new: true,
      runValidators: true
    })
      .populate('course', 'name code')
      .populate('professor', 'name email');

    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    res.json({ entry, message: 'Timetable entry updated' });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete timetable entry
// @route   DELETE /api/timetable/:id
exports.deleteEntry = async (req, res, next) => {
  try {
    const entry = await Timetable.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    res.json({ message: 'Timetable entry deleted' });
  } catch (error) {
    next(error);
  }
};
