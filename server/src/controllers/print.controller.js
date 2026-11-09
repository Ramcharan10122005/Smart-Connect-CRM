import prisma from '../config/prisma.js';

export async function renderContactPrint(req, res) {
  const { id } = req.params;
  const user = req.user;
  const now = new Date();

  // Find contact with owner scope check
  const contact = await prisma.contact.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(user.role === 'REP' ? { ownerId: user.id } : {}),
    },
    include: {
      company: true,
      owner: { select: { id: true, name: true, email: true } },
      source: { select: { id: true, name: true } },
      tags: { include: { tag: true } },
    },
  });

  if (!contact) {
    return res.status(404).render('errors/404', {
      title: 'Contact Not Found - SmartConnect CRM',
      message: 'The requested customer profile could not be found or access is restricted.',
    });
  }

  // Fetch open leads, last 20 activities, upcoming follow-ups
  const [openLeads, activities, upcomingFollowUps] = await Promise.all([
    // Open Leads
    prisma.lead.findMany({
      where: {
        contactId: id,
        deletedAt: null,
        status: 'OPEN',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        stage: { select: { name: true, color: true, probability: true } },
      },
    }),

    // Last 20 activities
    prisma.activity.findMany({
      where: {
        contactId: id,
      },
      orderBy: { occurredAt: 'desc' },
      take: 20,
      include: {
        createdBy: { select: { name: true } },
      },
    }),

    // Upcoming follow-ups
    prisma.followUp.findMany({
      where: {
        contactId: id,
        status: 'PENDING',
        dueAt: { gte: now },
      },
      orderBy: { dueAt: 'asc' },
      include: {
        assignee: { select: { name: true } },
      },
    }),
  ]);

  return res.render('print/contact', {
    title: `Print Profile - ${contact.firstName} ${contact.lastName}`,
    contact,
    openLeads,
    activities,
    upcomingFollowUps,
    hideNav: false,
  });
}

export default {
  renderContactPrint,
};
