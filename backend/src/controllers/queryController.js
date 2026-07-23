import Query from '../models/Query.js';

export const createQuery = async (req, res) => {
  try {
    const { subject, message } = req.body;
    const patientId = req.user._id;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message required' });
    }

    const query = await Query.create({
      patientId,
      subject,
      message,
      status: 'open',
    });

    await query.populate('patientId');

    res.status(201).json({
      message: 'Query submitted successfully',
      query,
    });
  } catch (error) {
    console.error('Create Query Error:', error);
    res.status(500).json({ error: 'Failed to create query' });
  }
};

export const getMyQueries = async (req, res) => {
  try {
    const patientId = req.user._id;

    const queries = await Query.find({ patientId })
      .populate('repliedBy')
      .sort({ createdAt: -1 });

    res.json(queries);
  } catch (error) {
    console.error('Get My Queries Error:', error);
    res.status(500).json({ error: 'Failed to fetch queries' });
  }
};

export const getOpenQueries = async (req, res) => {
  try {
    const queries = await Query.find({ status: 'open' })
      .populate('patientId')
      .sort({ createdAt: 1 });

    res.json(queries);
  } catch (error) {
    console.error('Get Open Queries Error:', error);
    res.status(500).json({ error: 'Failed to fetch queries' });
  }
};

export const replyToQuery = async (req, res) => {
  try {
    const { reply, assignedDoctorId } = req.body;
    const queryId = req.params.id;

    if (!reply) {
      return res.status(400).json({ error: 'Reply required' });
    }

    const query = await Query.findByIdAndUpdate(
      queryId,
      {
        reply,
        status: 'answered',
        repliedBy: req.user._id,
        repliedAt: new Date(),
        assignedDoctorId: assignedDoctorId || null,
      },
      { new: true }
    )
      .populate(['patientId', 'repliedBy', 'assignedDoctorId']);

    if (!query) {
      return res.status(404).json({ error: 'Query not found' });
    }

    res.json({
      message: 'Reply sent successfully',
      query,
    });
  } catch (error) {
    console.error('Reply To Query Error:', error);
    res.status(500).json({ error: 'Failed to send reply' });
  }
};

export const closeQuery = async (req, res) => {
  try {
    const query = await Query.findByIdAndUpdate(
      req.params.id,
      { status: 'closed' },
      { new: true }
    ).populate(['patientId', 'repliedBy']);

    if (!query) {
      return res.status(404).json({ error: 'Query not found' });
    }

    res.json({
      message: 'Query closed',
      query,
    });
  } catch (error) {
    console.error('Close Query Error:', error);
    res.status(500).json({ error: 'Failed to close query' });
  }
};
