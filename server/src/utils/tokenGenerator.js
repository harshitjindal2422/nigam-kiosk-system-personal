import { prisma } from '../config/db.js';
import { getISTDate } from './dateHelper.js';

/**
 * Generates a universal token number of the format:
 * TKN-[BIR/DEA/MAR]-[REG/CORR/PRI]-DDMM-NNN
 * 
 * @param {string} block - birth, death, marriage
 * @param {string} serviceType - registration, correction, print (or reg, corr, pri)
 * @returns {Promise<string>} Fully formatted token number
 */
export const generateUniversalToken = async (block, serviceType) => {
  const blockPrefix = block.substring(0, 3).toUpperCase(); // BIR, DEA, MAR
  
  let servicePrefix = 'REG';
  const typeUpper = serviceType.toUpperCase();
  if (typeUpper === 'CORRECTION' || typeUpper === 'CORR') {
    servicePrefix = 'CORR';
  } else if (typeUpper === 'PRINT' || typeUpper === 'PRI') {
    servicePrefix = 'PRI';
  }

  // Get current date strings (DDMM)
  const now = getISTDate();
  const day = String(now.getUTCDate()).padStart(2, '0');
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dateStr = `${day}${month}`; // e.g. 1106

  // Calculate boundary timestamps of the current day in IST calendar,
  // shifted back to actual UTC to match default database timestamps.
  const istStart = new Date(now);
  istStart.setUTCHours(0, 0, 0, 0);
  const istEnd = new Date(now);
  istEnd.setUTCHours(23, 59, 59, 999);

  const startOfDay = new Date(istStart.getTime() - 5.5 * 60 * 60 * 1000);
  const endOfDay = new Date(istEnd.getTime() - 5.5 * 60 * 60 * 1000);

  let count = 0;
  if (servicePrefix === 'PRI') {
    count = await prisma.printToken.count({
      where: {
        created_at: {
          gte: startOfDay,
          lte: endOfDay
        },
        certificate_type: block.toUpperCase()
      }
    });
  } else if (blockPrefix === 'MAR' && servicePrefix === 'REG') {
    count = await prisma.application.count({
      where: {
        created_at: {
          gte: startOfDay,
          lte: endOfDay
        },
        token_number: {
          startsWith: `TKN-${blockPrefix}-${servicePrefix}-${dateStr}`
        }
      }
    });
  } else {
    count = await prisma.token.count({
      where: {
        issued_at: {
          gte: startOfDay,
          lte: endOfDay
        },
        token_number: {
          startsWith: `TKN-${blockPrefix}-${servicePrefix}-${dateStr}`
        }
      }
    });
  }

  const nnn = String(count + 1).padStart(3, '0');
  return `TKN-${blockPrefix}-${servicePrefix}-${dateStr}-${nnn}`;
};
