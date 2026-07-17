import { prisma } from '@haru/database';

import { requireAdmin } from '@/lib/auth';

import { PublicPageEditor } from './public-page-editor';

export default async function PublicPagePage() {
  const { tenant } = await requireAdmin();

  const services = await prisma.service.findMany({
    where: { tenantId: tenant.id, active: true },
    orderBy: { priceCents: 'asc' },
    select: { name: true, priceCents: true },
    take: 6,
  });

  return (
    <PublicPageEditor
      name={tenant.name}
      slug={tenant.slug}
      address={tenant.address}
      description={tenant.description}
      about={tenant.about}
      segment={tenant.segment}
      email={tenant.email}
      instagram={tenant.instagram}
      phone={tenant.whatsappDisplayPhone}
      logoUrl={tenant.logoUrl}
      covers={tenant.coverImageUrls}
      amenities={tenant.amenities}
      publicBookingEnabled={tenant.publicBookingEnabled}
      publicBookingConfirmation={tenant.publicBookingConfirmation}
      services={services}
    />
  );
}
