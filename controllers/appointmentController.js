import { query } from '../config/db.js';

// ==========================================
// 1. APPOINTMENT CONTROLLER (CORE WORKFLOWS)
// ==========================================

/**
 * @desc    Create a new appointment
 * @route   POST /api/appointments
 * @access  Protected (Member, Manager, Admin)
 */
export const createAppointment = async (req, res, next) => {
  try {
    const { purpose, appointment_date, time_slot } = req.body;
    let member_id = req.body.member_id;

    // If logged-in user is a member, enforce scheduling under their own profile
    if (req.user.role === 'member') {
      if (!req.user.profile?.id) {
        return res.status(400).json({
          success: false,
          error: { message: 'Authenticated user session is not linked to a member profile.' }
        });
      }
      member_id = req.user.profile.id;
    }

    if (!member_id || !purpose || !appointment_date || !time_slot) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required appointment parameters (member_id, purpose, appointment_date, time_slot).' }
      });
    }

    // Verify member exists
    const memberCheck = await query('SELECT id, status FROM members WHERE id = $1', [member_id]);
    if (memberCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member profile not found.' }
      });
    }
    if (memberCheck.rows[0].status !== 'active') {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot book appointments for inactive or suspended members.' }
      });
    }

    const insertAppointment = `
      INSERT INTO appointments (member_id, purpose, appointment_date, time_slot, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *
    `;
    const result = await query(insertAppointment, [member_id, purpose, appointment_date, time_slot]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get appointments for the logged-in member
 * @route   GET /api/appointments/me
 * @access  Protected (Member)
 */
export const getMyAppointments = async (req, res, next) => {
  try {
    if (!req.user.profile?.id) {
      return res.status(400).json({
        success: false,
        error: { message: 'Authenticated user session is not linked to a member profile.' }
      });
    }

    const result = await query(
      `SELECT * FROM appointments 
       WHERE member_id = $1 
       ORDER BY appointment_date DESC, created_at DESC`,
      [req.user.profile.id]
    );

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all appointments (Admin/Manager view)
 * @route   GET /api/appointments
 * @access  Protected (Admin, Manager)
 */
export const getAllAppointments = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT a.*, m.first_name, m.last_name, u.username
       FROM appointments a
       JOIN members m ON a.member_id = m.id
       JOIN users u ON m.user_id = u.id
       ORDER BY a.appointment_date DESC, a.created_at DESC`
    );

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update appointment status
 * @route   PATCH /api/appointments/:id/status
 * @access  Protected (Member, Manager, Admin)
 */
export const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please specify the new appointment status.' }
      });
    }

    // Fetch existing appointment details
    const appCheck = await query('SELECT * FROM appointments WHERE id = $1', [id]);
    if (appCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Appointment not found.' }
      });
    }

    const appointment = appCheck.rows[0];

    // Access control logic
    if (req.user.role === 'member') {
      // Members are only allowed to cancel their own appointments
      if (appointment.member_id !== req.user.profile?.id) {
        return res.status(403).json({
          success: false,
          error: { message: 'You are not authorized to update this appointment.' }
        });
      }
      if (status !== 'cancelled') {
        return res.status(400).json({
          success: false,
          error: { message: 'Members can only change status to cancelled.' }
        });
      }
    }

    const updateQuery = `
      UPDATE appointments 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await query(updateQuery, [status, id]);

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};
