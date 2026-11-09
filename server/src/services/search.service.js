import prisma from '../config/prisma.js';

export async function searchGlobal(q, user) {
  const query = (q || '').trim();

  if (!query) {
    return {
      contacts: [],
      companies: [],
      leads: [],
    };
  }

  const isRep = user.role === 'REP';
  const ownerFilter = isRep ? { ownerId: user.id } : {};

  const [contacts, companies, leads] = await Promise.all([
    // Top 5 Contacts
    prisma.contact.findMany({
      where: {
        deletedAt: null,
        ...ownerFilter,
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
          { jobTitle: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 5,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        jobTitle: true,
        lifecycleStage: true,
        company: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
      },
    }),

    // Top 5 Companies
    prisma.company.findMany({
      where: {
        deletedAt: null,
        ...ownerFilter,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { domain: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 5,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        domain: true,
        phone: true,
        industry: true,
        owner: { select: { id: true, name: true } },
      },
    }),

    // Top 5 Leads
    prisma.lead.findMany({
      where: {
        deletedAt: null,
        ...ownerFilter,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { companyName: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 5,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        firstName: true,
        lastName: true,
        companyName: true,
        value: true,
        currency: true,
        status: true,
        stage: { select: { id: true, name: true, color: true } },
        owner: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    contacts,
    companies,
    leads,
  };
}

export default {
  searchGlobal,
};
