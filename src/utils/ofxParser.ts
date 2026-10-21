/**
 * OFX (Open Financial Exchange) Parser for CatFish
 * Supports SGML and XML variants from all major Brazilian banks (Nubank, Itaú, Inter, BB, Bradesco, etc.)
 */

export interface ParsedOfxTransaction {
  fitId: string;
  type: 'receita' | 'despesa';
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
  category: string;
  rawType: string;
}

export interface ParsedOfxResult {
  bankName: string;
  bankId?: string;
  accountId?: string;
  accountType?: string;
  balance?: number;
  balanceDate?: string;
  startDate?: string;
  endDate?: string;
  transactions: ParsedOfxTransaction[];
}

const BRAZILIAN_BANKS_MAP: Record<string, string> = {
  '001': 'Banco do Brasil',
  '033': 'Santander',
  '104': 'Caixa Econômica',
  '237': 'Bradesco',
  '260': 'Nubank',
  '341': 'Itaú',
  '077': 'Banco Inter',
  '336': 'C6 Bank',
  '290': 'PagBank',
  '380': 'PicPay',
  '212': 'Banco Original',
  '748': 'Sicredi',
  '756': 'Sicoob',
  '655': 'Neon',
  '422': 'Banco Safra',
  '041': 'Banrisul',
  '070': 'BRB',
  '197': 'Stone',
  '335': 'Digio',
  '085': 'Ailos',
  '136': 'Unicred',
};

/**
 * Categorizes a transaction based on keywords in its description/memo
 */
export function guessCategory(description: string, isIncome: boolean): string {
  const text = description.toLowerCase();

  if (isIncome) {
    if (/sal[aá]rio|folha|proventos|remunera[cç][aã]o|pr[oó]-?labore|rendimento|dividendos|jcp|resgate/i.test(text)) {
      return 'Salário';
    }
    if (/reembolso|estorno|devolu[cç][aã]o/i.test(text)) {
      return 'Outros';
    }
    return 'Receita';
  }

  // Despesas
  if (/mercado|supermercado|carrefour|p[aã]o de a[cç][uú]car|assai|assa[ií]|atacad[aã]o|hortifruti|a[cç]ougue|padaria|panificadora|sacol[aã]o|dia brasil/i.test(text)) {
    return 'Alimentação';
  }
  if (/ifood|rappi|restaurante|burger|lanche|pizza|sushi|caf[eé]|bistr[oô]|mcdonald|subway|habib|churrascaria|bar\b|pub\b/i.test(text)) {
    return 'Alimentação';
  }
  if (/uber|99app|99\b|taxi|combust[ií]vel|gasolina|etanol|posto\b|shell|ipiranga|petrobras|ped[aá]gio|sem parar|conectcar|veloe|estapar|estacionamento|bilhete [uú]nico|metr[oô]/i.test(text)) {
    return 'Transporte';
  }
  if (/aluguel|condom[ií]nio|enel|cpfl|cemig|copel|light|eletro|sabesp|sanepar|copasa|embasa|saneamento|g[aá]s\b|naturgy|iptu/i.test(text)) {
    return 'Moradia';
  }
  if (/internet|claro|vivo|tim\b|oi\b|telecom|net servi[cç]os/i.test(text)) {
    return 'Moradia';
  }
  if (/farm[aá]cia|drogaria|droga raia|drogasil|pague menos|pacheco|s[aã]o paulo|hospital|cl[ií]nica|consulta|dentista|odonto|exame|laborat[oó]rio|unimed|sulamerica|bradesco sa[uú]de/i.test(text)) {
    return 'Saúde';
  }
  if (/netflix|spotify|amazon prime|disney|hbo|max\b|youtube|cinema|ingresso|steam|playstation|psn|xbox|twitch|show|teatro|hotel|airbnb|booking|viagem|decolar/i.test(text)) {
    return 'Lazer';
  }
  if (/amazon|mercado livre|mercadolivre|shopee|shein|magalu|magazine luiza|americanas|casas bahia|zara|renner|c&a|riachuelo|aliexpress/i.test(text)) {
    return 'Compras';
  }
  if (/apple|google|adobe|microsoft|openai|chatgpt|udemy|alura|faculdade|escola|educa[cç][aã]o/i.test(text)) {
    return 'Serviços';
  }
  if (/tarifa|anuidade|juros|iof|encargos|multa/i.test(text)) {
    return 'Tarifas Bancárias';
  }

  return 'Outros';
}

/**
 * Extracts a value for a given tag from an OFX chunk
 * Handles both SGML (<TAG>Value\n) and XML (<TAG>Value</TAG>)
 */
function extractTagValue(content: string, tag: string): string | null {
  // Try XML closing tag first: <TAG>value</TAG>
  const xmlRegex = new RegExp(`<${tag}>([^<\\r\\n]+)<\\/${tag}>`, 'i');
  const xmlMatch = content.match(xmlRegex);
  if (xmlMatch && xmlMatch[1]) {
    return xmlMatch[1].trim();
  }

  // Try SGML tag: <TAG>value (terminated by next tag or line break)
  const sgmlRegex = new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i');
  const sgmlMatch = content.match(sgmlRegex);
  if (sgmlMatch && sgmlMatch[1]) {
    return sgmlMatch[1].trim();
  }

  return null;
}

/**
 * Parses OFX date string into YYYY-MM-DD
 * Examples: "20261021120000[-03:BRT]" -> "2026-10-21" or "20261021" -> "2026-10-21"
 */
function parseOfxDate(dateStr: string | null): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const cleaned = dateStr.replace(/[^0-9]/g, '');
  if (cleaned.length >= 8) {
    const year = cleaned.substring(0, 4);
    const month = cleaned.substring(4, 6);
    const day = cleaned.substring(6, 8);
    return `${year}-${month}-${day}`;
  }
  return new Date().toISOString().split('T')[0];
}

/**
 * Cleans transaction memo / description
 */
function cleanDescription(memo: string | null, name: string | null): string {
  let desc = memo || name || 'Lançamento bancário';
  // Remove redundant whitespaces
  desc = desc.replace(/\s+/g, ' ').trim();
  // Capitalize nicely if all uppercase
  if (desc === desc.toUpperCase() && desc.length > 3) {
    desc = desc.charAt(0) + desc.slice(1).toLowerCase();
  }
  return desc;
}

/**
 * Parses raw OFX file content into structured data
 */
export function parseOfx(ofxContent: string): ParsedOfxResult {
  if (!ofxContent || typeof ofxContent !== 'string') {
    throw new Error('Conteúdo do arquivo OFX vazio ou inválido.');
  }

  // Extract Bank / FI information
  const fiOrg = extractTagValue(ofxContent, 'ORG');
  const fiFid = extractTagValue(ofxContent, 'FID');
  const bankId = extractTagValue(ofxContent, 'BANKID') || fiFid || undefined;

  let bankName = 'Banco Conectado';
  if (bankId && BRAZILIAN_BANKS_MAP[bankId.padStart(3, '0')]) {
    bankName = BRAZILIAN_BANKS_MAP[bankId.padStart(3, '0')];
  } else if (fiOrg) {
    // Clean known bank names
    if (/nubank|nu pagamentos/i.test(fiOrg)) bankName = 'Nubank';
    else if (/ita[uú]/i.test(fiOrg)) bankName = 'Itaú';
    else if (/inter\b|banco inter/i.test(fiOrg)) bankName = 'Banco Inter';
    else if (/bradesco/i.test(fiOrg)) bankName = 'Bradesco';
    else if (/santander/i.test(fiOrg)) bankName = 'Santander';
    else if (/brasil/i.test(fiOrg)) bankName = 'Banco do Brasil';
    else if (/caixa/i.test(fiOrg)) bankName = 'Caixa Econômica';
    else if (/c6/i.test(fiOrg)) bankName = 'C6 Bank';
    else if (/sicredi/i.test(fiOrg)) bankName = 'Sicredi';
    else if (/sicoob/i.test(fiOrg)) bankName = 'Sicoob';
    else bankName = fiOrg;
  }

  // Extract Account information
  const accountId = extractTagValue(ofxContent, 'ACCTID') || undefined;
  const accountType = extractTagValue(ofxContent, 'ACCTTYPE') || 'CHECKING';

  // Extract Ledger Balance if present
  let balance: number | undefined;
  const balAmtStr = extractTagValue(ofxContent, 'BALAMT');
  if (balAmtStr) {
    const parsedBal = parseFloat(balAmtStr.replace(',', '.'));
    if (!isNaN(parsedBal)) balance = parsedBal;
  }
  const balanceDateStr = extractTagValue(ofxContent, 'DTASOF');
  const balanceDate = balanceDateStr ? parseOfxDate(balanceDateStr) : undefined;

  const dtStart = extractTagValue(ofxContent, 'DTSTART');
  const dtEnd = extractTagValue(ofxContent, 'DTEND');

  // Extract Transactions (<STMTTRN>...</STMTTRN> or SGML <STMTTRN>...)
  const transactions: ParsedOfxTransaction[] = [];

  // Match all STMTTRN segments
  // In XML it is <STMTTRN>...</STMTTRN>
  // In SGML it might be <STMTTRN> up to next <STMTTRN> or </BANKTRANLIST>
  const trnRegex = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>)|(?=<\/BANKTRANLIST>)|$)/gi;
  let match: RegExpExecArray | null;

  while ((match = trnRegex.exec(ofxContent)) !== null) {
    const trnBlock = match[1];
    if (!trnBlock || trnBlock.trim() === '') continue;

    const trnType = extractTagValue(trnBlock, 'TRNTYPE') || 'OTHER';
    const dtPosted = extractTagValue(trnBlock, 'DTPOSTED');
    const trnAmtStr = extractTagValue(trnBlock, 'TRNAMT');
    const fitId = extractTagValue(trnBlock, 'FITID') || `ofx-tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const memo = extractTagValue(trnBlock, 'MEMO');
    const name = extractTagValue(trnBlock, 'NAME');

    if (!trnAmtStr) continue;

    const rawAmt = parseFloat(trnAmtStr.replace(',', '.'));
    if (isNaN(rawAmt)) continue;

    const isCredit = rawAmt > 0 || trnType.toUpperCase() === 'CREDIT';
    const amount = Math.abs(rawAmt);
    const type: 'receita' | 'despesa' = isCredit ? 'receita' : 'despesa';
    const date = parseOfxDate(dtPosted);
    const description = cleanDescription(memo, name);
    const category = guessCategory(description, isCredit);

    transactions.push({
      fitId,
      type,
      amount,
      date,
      description,
      category,
      rawType: trnType,
    });
  }

  // Sort chronologically descending
  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    bankName,
    bankId,
    accountId,
    accountType,
    balance,
    balanceDate,
    startDate: dtStart ? parseOfxDate(dtStart) : undefined,
    endDate: dtEnd ? parseOfxDate(dtEnd) : undefined,
    transactions,
  };
}
