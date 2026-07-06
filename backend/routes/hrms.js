/**
 * /api/hrms — Enterprise HR Management (employees, attendance, leaves, payroll, performance, OKRs, assets)
 */
import express from 'express';
import Employee from '../models/hrms/Employee.js';
import Attendance from '../models/hrms/Attendance.js';
import LeaveRequest from '../models/hrms/LeaveRequest.js';
import Payroll from '../models/hrms/Payroll.js';
import PerformanceReview from '../models/hrms/PerformanceReview.js';
import OkrGoal from '../models/hrms/OkrGoal.js';
import AssetAssignment from '../models/hrms/AssetAssignment.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireOrgMember } from '../middleware/orgPermissions.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';

const router = express.Router();
router.use(authenticateToken);

// ══════════ EMPLOYEES ══════════

router.get('/:orgId/employees', requireOrgMember, async (req, res) => {
  try {
    const { status, department, search } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { organizationId: req.params.orgId };
    if (status) filter.status = status;
    if (department) filter.departmentId = department;
    if (search) filter.$text = { $search: search };
    const [employees, total] = await Promise.all([
      Employee.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      Employee.countDocuments(filter),
    ]);
    res.json(paginatedResponse(employees, total, page, limit));
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:orgId/employees', requireOrgMember, async (req, res) => {
  try {
    const emp = await Employee.create({ organizationId: req.params.orgId, ...req.body });
    res.status(201).json({ success: true, employee: emp });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/:orgId/employees/:empId', requireOrgMember, async (req, res) => {
  try {
    const emp = await Employee.findOne({ organizationId: req.params.orgId, employeeId: req.params.empId }).lean();
    if (!emp) return res.status(404).json({ success: false, message: 'Employee not found.' });
    res.json({ success: true, employee: emp });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:orgId/employees/:empId', requireOrgMember, async (req, res) => {
  try {
    const emp = await Employee.findOneAndUpdate({ organizationId: req.params.orgId, employeeId: req.params.empId }, req.body, { new: true });
    res.json({ success: true, employee: emp });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ ATTENDANCE ══════════

router.post('/:orgId/attendance/checkin', requireOrgMember, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const att = await Attendance.findOneAndUpdate(
      { organizationId: req.params.orgId, employeeId: req.user.userId, date: today },
      { organizationId: req.params.orgId, employeeId: req.user.userId, date: today, checkIn: new Date(), status: 'present', method: req.body.method || 'web' },
      { upsert: true, new: true }
    );
    res.json({ success: true, attendance: att });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:orgId/attendance/checkout', requireOrgMember, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const att = await Attendance.findOne({ organizationId: req.params.orgId, employeeId: req.user.userId, date: today });
    if (!att) return res.status(400).json({ success: false, message: 'No check-in found today.' });
    att.checkOut = new Date();
    att.workingHours = Math.round((att.checkOut - att.checkIn) / 3600000 * 10) / 10;
    att.overtime = Math.max(0, att.workingHours - 8);
    await att.save();
    res.json({ success: true, attendance: att });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/:orgId/attendance', requireOrgMember, async (req, res) => {
  try {
    const { employeeId, month } = req.query;
    const filter = { organizationId: req.params.orgId };
    if (employeeId) filter.employeeId = employeeId;
    else filter.employeeId = req.user.userId;
    if (month) { const start = new Date(`${month}-01`); const end = new Date(start); end.setMonth(end.getMonth() + 1); filter.date = { $gte: start, $lt: end }; }
    const records = await Attendance.find(filter).sort({ date: -1 }).limit(31).lean();
    res.json({ success: true, attendance: records });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ LEAVES ══════════

router.post('/:orgId/leaves', requireOrgMember, async (req, res) => {
  try {
    const leave = await LeaveRequest.create({ organizationId: req.params.orgId, employeeId: req.user.userId, ...req.body });
    res.status(201).json({ success: true, leave });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/:orgId/leaves', requireOrgMember, async (req, res) => {
  try {
    const { status, employeeId } = req.query;
    const filter = { organizationId: req.params.orgId };
    if (employeeId) filter.employeeId = employeeId;
    else filter.employeeId = req.user.userId;
    if (status) filter.status = status;
    const leaves = await LeaveRequest.find(filter).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ success: true, leaves });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:orgId/leaves/:id/approve', requireOrgMember, async (req, res) => {
  try {
    const leave = await LeaveRequest.findByIdAndUpdate(req.params.id, { status: 'approved', approvedBy: req.user.userId, approvedAt: new Date() }, { new: true });
    res.json({ success: true, leave });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:orgId/leaves/:id/reject', requireOrgMember, async (req, res) => {
  try {
    const leave = await LeaveRequest.findByIdAndUpdate(req.params.id, { status: 'rejected', rejectionReason: req.body.reason || '' }, { new: true });
    res.json({ success: true, leave });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ PAYROLL ══════════

router.get('/:orgId/payroll', requireOrgMember, async (req, res) => {
  try {
    const { period, employeeId } = req.query;
    const filter = { organizationId: req.params.orgId };
    if (period) filter.period = period;
    if (employeeId) filter.employeeId = employeeId;
    else filter.employeeId = req.user.userId;
    const payslips = await Payroll.find(filter).sort({ period: -1 }).limit(12).lean();
    res.json({ success: true, payslips });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:orgId/payroll', requireOrgMember, async (req, res) => {
  try {
    const payroll = await Payroll.create({ organizationId: req.params.orgId, ...req.body });
    res.status(201).json({ success: true, payroll });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ PERFORMANCE ══════════

router.get('/:orgId/performance', requireOrgMember, async (req, res) => {
  try {
    const { employeeId, cycle } = req.query;
    const filter = { organizationId: req.params.orgId };
    if (employeeId) filter.employeeId = employeeId;
    else filter.employeeId = req.user.userId;
    if (cycle) filter.cycle = cycle;
    const reviews = await PerformanceReview.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, reviews });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:orgId/performance', requireOrgMember, async (req, res) => {
  try {
    const review = await PerformanceReview.create({ organizationId: req.params.orgId, reviewerId: req.user.userId, ...req.body });
    res.status(201).json({ success: true, review });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ OKRs ══════════

router.get('/:orgId/okrs', requireOrgMember, async (req, res) => {
  try {
    const { level, employeeId } = req.query;
    const filter = { organizationId: req.params.orgId };
    if (level) filter.level = level;
    if (employeeId) filter.employeeId = employeeId;
    const okrs = await OkrGoal.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, okrs });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:orgId/okrs', requireOrgMember, async (req, res) => {
  try {
    const okr = await OkrGoal.create({ organizationId: req.params.orgId, ...req.body });
    res.status(201).json({ success: true, okr });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:orgId/okrs/:id/progress', requireOrgMember, async (req, res) => {
  try {
    const okr = await OkrGoal.findByIdAndUpdate(req.params.id, { progress: req.body.progress, keyResults: req.body.keyResults }, { new: true });
    res.json({ success: true, okr });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ ASSETS ══════════

router.get('/:orgId/assets', requireOrgMember, async (req, res) => {
  try {
    const filter = { organizationId: req.params.orgId };
    if (req.query.employeeId) filter.employeeId = req.query.employeeId;
    else filter.employeeId = req.user.userId;
    const assets = await AssetAssignment.find(filter).sort({ issuedDate: -1 }).lean();
    res.json({ success: true, assets });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:orgId/assets', requireOrgMember, async (req, res) => {
  try {
    const asset = await AssetAssignment.create({ organizationId: req.params.orgId, ...req.body });
    res.status(201).json({ success: true, asset });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:orgId/assets/:id/return', requireOrgMember, async (req, res) => {
  try {
    const asset = await AssetAssignment.findByIdAndUpdate(req.params.id, { returnedDate: new Date(), condition: req.body.condition || 'returned' }, { new: true });
    res.json({ success: true, asset });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ══════════ HR ANALYTICS ══════════

router.get('/:orgId/analytics', requireOrgMember, async (req, res) => {
  try {
    const orgId = req.params.orgId;
    const [total, active, onLeave, probation, notice] = await Promise.all([
      Employee.countDocuments({ organizationId: orgId }),
      Employee.countDocuments({ organizationId: orgId, status: 'active' }),
      Employee.countDocuments({ organizationId: orgId, status: 'on_leave' }),
      Employee.countDocuments({ organizationId: orgId, status: 'probation' }),
      Employee.countDocuments({ organizationId: orgId, status: 'notice_period' }),
    ]);
    res.json({ success: true, analytics: { total, active, onLeave, probation, noticePeriod: notice } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;
