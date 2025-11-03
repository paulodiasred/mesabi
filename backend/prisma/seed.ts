import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Brand
  const brand = await prisma.brand.create({
    data: {
      name: 'ComidaSmart Chain',
    },
  });

  // Create Channels
  const channels = await prisma.channel.createMany({
    data: [
      { name: 'Canal Presencial', type: 'P', brandId: brand.id },
      { name: 'Canal iFood', type: 'D', brandId: brand.id },
      { name: 'Canal Rappi', type: 'D', brandId: brand.id },
      { name: 'Canal Uber Eats', type: 'D', brandId: brand.id },
    ],
  });

  // Get created channels
  const createdChannels = await prisma.channel.findMany({ where: { brandId: brand.id } });
  const canalPresencial = createdChannels.find(c => c.name === 'Canal Presencial')!;
  const canalIfood = createdChannels.find(c => c.name === 'Canal iFood')!;

  // Create Categories
  const categories = await prisma.category.createMany({
    data: [
      { name: 'Burgers', type: 'P', brandId: brand.id },
      { name: 'Bebidas', type: 'P', brandId: brand.id },
      { name: 'Acompanhamentos', type: 'P', brandId: brand.id },
      { name: 'Adicionais', type: 'I', brandId: brand.id },
      { name: 'Remover', type: 'I', brandId: brand.id },
    ],
  });

  const createdCategories = await prisma.category.findMany({ where: { brandId: brand.id } });
  const catBurgers = createdCategories.find(c => c.name === 'Burgers')!;
  const catBebidas = createdCategories.find(c => c.name === 'Bebidas')!;
  const catAdicionais = createdCategories.find(c => c.name === 'Adicionais')!;

  // Create Products
  const products = await prisma.product.createMany({
    data: [
      { name: 'X-Burger', brandId: brand.id, categoryId: catBurgers.id },
      { name: 'X-Bacon', brandId: brand.id, categoryId: catBurgers.id },
      { name: 'X-Salada', brandId: brand.id, categoryId: catBurgers.id },
      { name: 'Refrigerante 600ml', brandId: brand.id, categoryId: catBebidas.id },
      { name: 'Suco Natural', brandId: brand.id, categoryId: catBebidas.id },
    ],
  });

  const createdProducts = await prisma.product.findMany({ where: { brandId: brand.id } });
  const xBacon = createdProducts.find(p => p.name === 'X-Bacon')!;
  const xBurger = createdProducts.find(p => p.name === 'X-Burger')!;

  // Create Items (adicionalos)
  const items = await prisma.item.createMany({
    data: [
      { name: 'Bacon Extra', brandId: brand.id, categoryId: catAdicionais.id },
      { name: 'Queijo Extra', brandId: brand.id, categoryId: catAdicionais.id },
      { name: 'Cebola', brandId: brand.id, categoryId: catAdicionais.id },
    ],
  });

  const createdItems = await prisma.item.findMany({ where: { brandId: brand.id } });
  const baconExtra = createdItems.find(i => i.name === 'Bacon Extra')!;

  // Create Payment Types
  const paymentTypes = await prisma.paymentType.createMany({
    data: [
      { description: 'Dinheiro', brandId: brand.id },
      { description: 'Cartão Débito', brandId: brand.id },
      { description: 'Cartão Crédito', brandId: brand.id },
      { description: 'PIX', brandId: brand.id },
    ],
  });

  const createdPaymentTypes = await prisma.paymentType.findMany({ where: { brandId: brand.id } });
  const pix = createdPaymentTypes.find(pt => pt.description === 'PIX')!;

  // Create Stores
  const stores = await prisma.store.createMany({
    data: [
      { name: 'Loja Centro SP', city: 'São Paulo', state: 'SP', brandId: brand.id },
      { name: 'Loja Tatuapé', city: 'São Paulo', state: 'SP', brandId: brand.id },
      { name: 'Loja Copacabana', city: 'Rio de Janeiro', state: 'RJ', brandId: brand.id },
    ],
  });

  const createdStores = await prisma.store.findMany({ where: { brandId: brand.id } });
  const lojaCentro = createdStores.find(s => s.name === 'Loja Centro SP')!;

  // Create Customers
  const customers = await prisma.customer.createMany({
    data: [
      { customerName: 'João Silva', email: 'joao@email.com', storeId: lojaCentro.id },
      { customerName: 'Maria Santos', email: 'maria@email.com', storeId: lojaCentro.id },
    ],
  });

  const createdCustomers = await prisma.customer.findMany();
  const joao = createdCustomers.find(c => c.customerName === 'João Silva')!;

  // Create Sample Sales (last 30 days)
  const now = new Date();
  for (let i = 0; i < 50; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const createdAt = new Date(now);
    createdAt.setDate(createdAt.getDate() - daysAgo);

    const totalAmount = 30 + Math.random() * 70; // R$ 30-100

    const sale = await prisma.sale.create({
      data: {
        storeId: lojaCentro.id,
        channelId: Math.random() > 0.4 ? canalIfood.id : canalPresencial.id,
        customerId: Math.random() > 0.3 ? joao.id : null,
        saleStatusDesc: 'COMPLETED',
        totalAmountItems: totalAmount * 0.9,
        totalDiscount: totalAmount * 0.1,
        totalAmount: totalAmount,
        valuePaid: totalAmount,
        productionSeconds: 600 + Math.random() * 1200, // 10-30 min
        deliverySeconds: Math.random() > 0.4 ? 900 + Math.random() * 1800 : null, // 15-45 min if delivery
        createdAt,
      },
    });

    // Add product to sale
    await prisma.productSale.create({
      data: {
        saleId: sale.id,
        productId: Math.random() > 0.5 ? xBacon.id : xBurger.id,
        quantity: 1,
        basePrice: totalAmount * 0.8,
        totalPrice: totalAmount * 0.8,
      },
    });

    // Payment
    await prisma.payment.create({
      data: {
        saleId: sale.id,
        paymentTypeId: pix.id,
        value: totalAmount,
      },
    });
  }

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

