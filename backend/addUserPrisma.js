const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
    const hashedPassword = await bcrypt.hash('9898577', 10)
    const user = await prisma.user.upsert({
        where: { email: 'kusumpanchal31@gmail.com' },
        update: { passwordHash: hashedPassword },
        create: {
            name: 'Kusum Panchal',
            email: 'kusumpanchal31@gmail.com',
            passwordHash: hashedPassword,
        }
    })
    console.log('Successfully added user:', user.email)
}
main().catch(console.error).finally(() => prisma.$disconnect())
