/**
 * Seeds de demonstracao, extraidos do antigo db.ts sem alteracao de conteudo.
 *
 * REGRA: o codigo de producao NAO popula o banco no boot. O db.ts anterior
 * fazia "if (!fs.existsSync(DB_FILE)) save(seeds)" a cada start - comportamento
 * de demo vazando para producao, que mascarava banco vazio e tornava qualquer
 * ambiente novo indistinguivel de um ambiente populado. A populacao inicial
 * agora e um passo explicito e idempotente:
 *
 *     npm run db:migrate   # aplica supabase/migrations/*.sql
 *     npm run db:seed      # popula programas, participantes, episodios, agenda e biblioteca
 *
 * Os dois sao idempotentes: rodar de novo nao duplica nada e nao estoura
 * unique de legacy_id, porque tudo passa por upsert.
 *
 * Nenhum seed novo foi criado e nenhum dado ficticio foi acrescentado: e o
 * mesmo conjunto que o data/db.json carregava.
 */
import { AgendaEvent, CameraConfig, Episode, LibraryAsset, Participant, Program } from '../types';

// --- Standard Camera Configurations ---
const defaultInterviewCameras: CameraConfig[] = [
  {
    id: 'cam-1',
    name: 'CAM 1',
    role: 'Frontal Apresentador',
    label: 'Frontal Apresentador',
    position: 'Centro Frontal 0°',
    framing: 'Plano Médio / Close-up Frontal',
    purpose: 'Abertura, encerramento, passagens diretas, teleprompter e conexão com a audiência',
    active: true,
  },
  {
    id: 'cam-2',
    name: 'CAM 2',
    role: '45° Apresentador',
    label: '45° Apresentador',
    position: 'Lateral Esquerda 45°',
    framing: 'Plano Médio perfil 45 graus',
    purpose: 'Perguntas ao convidado, reações, escuta ativa e diálogo na bancada',
    active: true,
  },
  {
    id: 'cam-3',
    name: 'CAM 3',
    role: '45° Convidado',
    label: '45° Convidado',
    position: 'Lateral Direita 45°',
    framing: 'Plano Médio / Close expressivo 45 graus',
    purpose: 'Respostas principais, histórias de impacto, confissões e planos fechados',
    active: true,
  },
];

const auditoriumCameras: CameraConfig[] = [
  {
    id: 'cam-aud-1',
    name: 'CAM 1',
    role: 'Plano Geral Auditório',
    label: 'Plano Geral Auditório',
    position: 'Fundo Central',
    framing: 'Plano Geral Aberto com Grua',
    purpose: 'Abertura, passagens amplas, visão total do palco, reações coletivas',
    active: true,
  },
  {
    id: 'cam-aud-2',
    name: 'CAM 2',
    role: 'Apresentador',
    label: 'Apresentador (Netto)',
    position: 'Centro Pista',
    framing: 'Plano Médio e Americano',
    purpose: 'Condução do programa, monólogo, interação com câmeras e palco',
    active: true,
  },
  {
    id: 'cam-aud-3',
    name: 'CAM 3',
    role: 'Convidados no Sofá',
    label: 'Convidados no Sofá',
    position: 'Lateral Direita Palco',
    framing: 'Plano Médio e Close Duplo',
    purpose: 'Entrevistas, depoimentos e reações dos convidados',
    active: true,
  },
  {
    id: 'cam-aud-4',
    name: 'CAM 4',
    role: 'Banda / Palco Musical',
    label: 'Banda X / Palco Musical',
    position: 'Lateral Esquerda Palco',
    framing: 'Plano Médio e Detalhes Instrumentais',
    purpose: 'Performances ao vivo, vinhetas instrumentais e interação musical',
    active: true,
  },
  {
    id: 'cam-aud-5',
    name: 'CAM 5',
    role: 'Plateia e Reações',
    label: 'Plateia e Reações',
    position: 'Frente da Arquibancada',
    framing: 'Plano Médio e Closes de Espectadores',
    purpose: 'Aplausos, risadas, perguntas do auditório e reações calorosas',
    active: true,
  },
];

// --- Seed Programs ---
export const seedPrograms: Program[] = [
  {
    id: 'prog-1',
    title: 'Mentes de Valor',
    description: 'Entrevistas aprofundadas com empreendedores, fundadores e líderes que superaram crises severas e construíram impérios.',
    host: 'Renan Vianna',
    format: 'Entrevista',
    defaultDurationMin: 45,
    editorialStyle: 'Cinematográfico, humano, investigativo e inspirador. Foco no conflito real e aprendizados práticos.',
    scenario: 'Estúdio escuro com iluminação pontual âmbar/tungstênio, mesa de madeira rústica e microfones Shure SM7B.',
    cameras: defaultInterviewCameras,
    standardStructure: [
      'Cold Open de Alto Impacto',
      'Vinheta / Abertura Direta',
      'A Origem Humilde e a Primeira Fagulha',
      'A Grande Ruptura / A Enchente',
      'A Virada Estratégica e Crescimento',
      'Aprendizados e Lado Humano',
      'Ping-Pong Rápido',
      'Encerramento e Lição Final'
    ],
    defaultOpening: 'Existe um capítulo na história de todo grande empresário que você nunca vai ler nos manuais de negócios...',
    defaultClosing: 'Essa foi mais uma história real de quem colocou o peito na linha de fogo. Se essa conversa te inspirou, inscreva-se e compartilhe com quem está construindo seu sonho.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prog-2',
    title: 'Programa de Auditório do Netto',
    description: 'Grande programa de auditório semanal ao vivo com apresentador, convidados especiais, bandas ao vivo, games interativos e participação da plateia.',
    host: 'Netto',
    format: 'Programa de auditório',
    defaultDurationMin: 60,
    editorialStyle: 'Caloroso, enérgico, popular, emocionante e bem ritmado com intervenções musicais.',
    scenario: 'Auditório para 200 pessoas com palco em semicírculo, sofá de veludo para convidados, praticável da banda e telão de LED curvo.',
    cameras: auditoriumCameras,
    standardStructure: [
      'Abertura Triunfal com Auditório',
      'Entrevista Convidado 1',
      'Entrevista Convidado 2',
      'Perguntas da Plateia',
      'Jogo / Desafio no Palco',
      'Apresentação Musical ao Vivo',
      'Conversa com a Banda',
      'Encerramento Festivo'
    ],
    defaultOpening: 'Boa noite, Brasil! Está no ar o nosso encontro de histórias, música e emoção!',
    defaultClosing: 'Obrigado pelo carinho de sempre, auditório maravilhoso! Até o próximo sábado com mais emoções!',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// --- Seed Participants (tied to programs) ---
export const seedParticipants: Participant[] = [
  // For Mentes de Valor
  {
    id: 'part-1',
    programId: 'prog-1',
    name: 'Renan Vianna',
    type: 'Apresentador',
    role: 'Apresentador Titular',
    companyOrGroup: 'TakeMaster Studio',
    bio: 'Jornalista e podcaster com 12 anos de experiência em programas de liderança e negócios.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'part-2',
    programId: 'prog-1',
    name: 'João Silva',
    type: 'Empresário',
    role: 'Fundador & CEO',
    companyOrGroup: 'Ferramentas Brasil S/A',
    bio: 'Começou como mecânico aos 17 anos em São Bernardo do Campo. Vendeu ferramentas usadas numa Kombi em 2008. Hoje comanda uma fábrica de 12.000m² com 420 colaboradores.',
    notes: 'Homem humilde, fala com entusiasmo sobre a família e a equipe de chão de fábrica.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'part-3',
    programId: 'prog-1',
    name: 'Dra. Camila Nogueira',
    type: 'Especialista',
    role: 'Cofundadora & CTO',
    companyOrGroup: 'BioHealth Analytics',
    bio: 'Pioneira em inteligência artificial na saúde e visão computacional na América Latina.',
    createdAt: new Date().toISOString(),
  },

  // For Programa de Auditório do Netto
  {
    id: 'part-aud-1',
    programId: 'prog-2',
    name: 'Netto',
    type: 'Apresentador',
    role: 'Apresentador Principal',
    companyOrGroup: 'Auditório do Netto',
    bio: 'Comunicador carismático e condutor de auditório com estilo dinâmico e empático.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'part-aud-2',
    programId: 'prog-2',
    name: 'João',
    type: 'Empresário',
    role: 'Convidado Especial',
    companyOrGroup: 'Fábrica Brasil',
    bio: 'Empresário que começou do zero e superou enchente catastrófica.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'part-aud-3',
    programId: 'prog-2',
    name: 'Maria',
    type: 'Empresária',
    role: 'Convidada Especial',
    companyOrGroup: 'Rede Sabor Caseiro',
    bio: 'Criou uma rede nacional de franquias a partir de doces vendidos na faculdade.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'part-aud-4',
    programId: 'prog-2',
    name: 'Banda X',
    type: 'Banda',
    groupType: 'band',
    role: 'Banda Residente / Atração Musical',
    companyOrGroup: 'Banda X Oficial',
    members: ['Lucas (Vocal)', 'Beto (Guitarra)', 'Thiago (Baixo)', 'Marcelo (Bateria)'],
    bio: 'Banda de pop rock com mais de 50 milhões de streams e energia contagiante ao vivo.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'part-aud-5',
    programId: 'prog-2',
    name: 'Plateia do Auditório',
    type: 'Plateia',
    role: 'Auditório Participativo',
    companyOrGroup: 'Caravanas de SP e RJ',
    bio: '200 pessoas convidadas prontas para interações, votações e perguntas ao vivo.',
    createdAt: new Date().toISOString(),
  },
];

// --- Seed Episodes ---
export const seedEpisodes: Episode[] = [
  // Episode 1: Interview Episode (Mentes de Valor)
  {
    id: 'ep-1',
    programId: 'prog-1',
    showId: 'prog-1',
    episodeNumber: 14,
    title: 'Da Kombi Velha à Fábrica de 400 Funcionários',
    idea: 'Entrevista com João Silva: começou vendendo ferramentas numa Kombi usada e hoje é dono de uma das maiores fábricas do país. A verdade sobre a quase falência em 2014, a enchente e como liderar sem ter feito faculdade.',
    format: 'Entrevista',
    targetDurationMin: 45,
    objective: 'Inspirar quem está no início do negócio e revelar a resiliência prática necessária para suportar perdas catastróficas.',
    additionalInfo: 'João trouxe uma chave de boca número 17 que foi a primeira ferramenta vendida por ele.',
    status: 'ready',
    participants: [
      {
        participantId: 'part-1',
        name: 'Renan Vianna',
        type: 'Apresentador',
        role: 'Apresentador',
        order: 1,
        isFeatured: false,
        estimatedTimeMin: 45,
      },
      {
        participantId: 'part-2',
        name: 'João Silva',
        type: 'Empresário',
        role: 'Convidado Principal',
        order: 2,
        isFeatured: true,
        estimatedTimeMin: 45,
        notes: 'Foco na história da enchente de 2014 e na chave nº 17',
      }
    ],
    segments: [
      {
        id: 'seg-1',
        order: 1,
        blockNumber: 1,
        title: 'Cold Open & Abertura',
        type: 'Abertura',
        estimatedDurationMin: 3,
        participantIds: ['part-1', 'part-2'],
        objective: 'Criar gancho eletrizante e contextualizar a dimensão da jornada de João.',
        transitionText: 'João, antes de falar da fábrica com 400 colaboradores, quero voltar ao dia em que tudo quase morreu.'
      },
      {
        id: 'seg-2',
        order: 2,
        blockNumber: 2,
        title: 'A Origem na Kombi e a Fome de Vencer',
        type: 'Entrevista',
        estimatedDurationMin: 8,
        participantIds: ['part-1', 'part-2'],
        objective: 'Mapear a gênese: o mecânico que virou mascate de ferramentas.',
        transitionText: 'Tudo parecia estar caminhando para frente até que o mês de março de 2014 chegou...'
      },
      {
        id: 'seg-3',
        order: 3,
        blockNumber: 3,
        title: 'A Grande Ruptura: A Enchente de 2014',
        type: 'História',
        estimatedDurationMin: 12,
        participantIds: ['part-1', 'part-2'],
        objective: 'Extrair o momento de maior vulnerabilidade humana e teste de caráter.',
        transitionText: 'Muita gente teria jogado a toalha ali. Você não só continuou como decidiu fabricar suas próprias ferramentas.'
      },
      {
        id: 'seg-4',
        order: 4,
        blockNumber: 4,
        title: 'A Virada Industrial: Da Revenda à Fabricação',
        type: 'Entrevista',
        estimatedDurationMin: 10,
        participantIds: ['part-1', 'part-2'],
        objective: 'Analisar a decisão de fabricar no Brasil contra importados chineses.',
        transitionText: 'Com o crescimento, veio o desafio mais silencioso: aprender a liderar 400 pessoas.'
      },
      {
        id: 'seg-5',
        order: 5,
        blockNumber: 5,
        title: 'Ping-Pong Rápido & Encerramento',
        type: 'Perguntas rápidas',
        estimatedDurationMin: 12,
        participantIds: ['part-1', 'part-2'],
        objective: 'Fechar com ritmo dinâmico, conselho prático e CTA direto com o público.',
        transitionText: 'João, muito obrigado pela verdade trazida a essa mesa hoje.'
      }
    ],
    diagnosis: {
      centralTheme: 'A travessia da sobrevivência operária para a liderança industrial em grande escala.',
      potentialStory: 'A jornada de um homem que só tinha ferramentas de segunda mão e usou lealdade para renascer após enchente.',
      primaryConflict: 'A enchente de 2014: R$ 1,8 milhão em dívidas vencidas e R$ 12 na conta no dia da folha.',
      primaryTransformation: 'De vendedor autônomo individualista para um líder respeitado por centenas de operários.',
      whyWatch: 'Mostra o empreendedorismo real brasileiro sem romantização: com calo nas mãos e negociação dura.',
      whatToDiscover: 'O que ele fez exatamente na manhã seguinte à enchente e como conseguiu crédito.',
      researchPoints: [
        'Confirmar data exata e prejuízo da enchente de 2014',
        'Checar a transição da revenda para a fabricação própria em 2017'
      ],
      highImpactMoments: [
        'A confissão dos R$ 12 na conta no momento da enchente',
        'A chegada da chave número 17 no estúdio como âncora emocional'
      ],
      approved: true,
    },
    research: {
      aboutGuest: 'João Silva, 48 anos, natural do ABC paulista. Começou a trabalhar aos 12 anos como engraxate.',
      trajectory: '1998: Mecânico contratado. 2004: Adquire Kombi 1989. 2014: Enchente histórica. 2017: Linha fabril própria. 2024: Planta de 12.000m².',
      company: 'Ferramentas Brasil S/A. 800 SKUs ativos, distribuição em 2.400 pontos de venda.',
      keyDatesAndNumbers: '2004 (início Kombi) | 2014 (enchente R$ 1,8M) | 420 colaboradores | R$ 85M faturamento.',
      previousInterviews: 'Participou do podcast da ACIABC em 2023.',
      recurringThemes: 'Disciplina, respeito aos operários e aversão a endividamento predatório.',
      contradictionsAndClarifications: 'Na entrevista de 2021 disse que nunca pegou empréstimo, mas em 2023 citou linha do BNDES para forno industrial.',
      compellingStories: 'O dia em que o fornecedor alemão comeu marmitex com os operários no chão de fábrica.',
      sources: [
        {
          id: 'src-1',
          title: 'Registro JUCESP',
          detail: 'Fundação formal em 12/03/2010 sob CNPJ ativo.',
          status: 'CONFIRMADO',
          category: 'company'
        },
        {
          id: 'src-2',
          title: 'Noticiário Climático Março 2014',
          detail: 'Transbordamento do córrego dos Meninos que alagou galpões no ABC.',
          status: 'CONFIRMADO',
          category: 'dates_numbers'
        }
      ]
    },
    questions: [
      {
        id: 'q-1',
        segmentId: 'seg-2',
        order: 1,
        text: 'João, você lembra exatamente do momento em que percebeu que continuar como mecânico contratado não ia dar o futuro que sua família precisava?',
        objective: 'Descobrir a fagulha inicial da coragem empreendedora.',
        suggestedCamera: 'CAM 2',
        targetParticipantName: 'João Silva',
        followUps: [
          {
            id: 'fu-1',
            triggerCondition: 'SE FALAR SOBRE MEDO OU FAMÍLIA',
            actionOrQuestion: 'Sua esposa te apoiou ou ela pediu pra você não largar a carteira assinada?',
            tag: 'FAMÍLIA'
          }
        ]
      },
      {
        id: 'q-2',
        segmentId: 'seg-3',
        order: 1,
        text: 'Me leva para a manhã seguinte à chuva de março de 2014. Quando você abriu a porta de aço do galpão, o que os seus olhos viram?',
        objective: 'Criar imagem sensorial profunda da pior crise da vida dele.',
        suggestedCamera: 'CAM 2',
        targetParticipantName: 'João Silva',
        followUps: [
          {
            id: 'fu-2',
            triggerCondition: 'SE ELE EMBARGAR A VOZ OU SE EMOCIONAR',
            actionOrQuestion: 'NÃO INTERROMPER. Segurar silêncio e manter plano na CAM 3.',
            tag: 'NÃO INTERROMPER'
          },
          {
            id: 'fu-3',
            triggerCondition: 'SE FALAR SOBRE DINHEIRO',
            actionOrQuestion: 'É verdade que você tinha literalmente R$ 12 na conta?',
            tag: 'DINHEIRO'
          }
        ]
      }
    ],
    script: [
      {
        id: 'sc-1',
        segmentId: 'seg-1',
        timestamp: '00:00',
        type: 'cold_open',
        camera: 'CAM 3',
        speaker: 'João Silva',
        eyeDirection: 'Olhar distante, pensativo',
        shotType: 'Plano Fechado Convidado',
        content: '"Naquela manhã de 2014, quando a água baixou, eu abri a porta do galpão... Eu devia R$ 1,8 milhão e tinha R$ 12 no banco. O gerente disse: João, você tá liquidado."',
        directionalMarkers: ['COLD OPEN', 'PAUSA DRAMÁTICA', 'CORTE SECO'],
        isTeleprompter: false,
      },
      {
        id: 'sc-2',
        segmentId: 'seg-1',
        timestamp: '00:30',
        type: 'opening',
        camera: 'CAM 1',
        speaker: 'Renan Vianna (Apresentador)',
        eyeDirection: 'Olhar firme para a lente',
        shotType: 'Plano Médio Frontal',
        content: 'Existe um capítulo na vida de quase todo empresário de sucesso que você não vai encontrar em livros. Hoje você vai conhecer a história de quem começou numa Kombi de segunda mão e construiu uma das maiores indústrias do país. Com vocês, João Silva.',
        directionalMarkers: ['OLHAR PARA LENTE', 'TOM FIRME'],
        isTeleprompter: true,
      },
      {
        id: 'sc-3',
        segmentId: 'seg-2',
        timestamp: '01:30',
        type: 'question',
        camera: 'CAM 2',
        speaker: 'Renan Vianna (Apresentador)',
        targetPerson: 'João Silva',
        eyeDirection: 'Olhar para convidado',
        shotType: 'Plano Médio 45°',
        content: 'João, você lembra exatamente do momento em que percebeu que precisava arriscar e largar a oficina onde era empregado?',
        directionalMarkers: ['CORTE SUAVE → CAM 3 AO FINAL DA PERGUNTA'],
        isTeleprompter: false,
        questionRefId: 'q-1',
      },
      {
        id: 'sc-4',
        segmentId: 'seg-3',
        timestamp: '11:15',
        type: 'question',
        camera: 'CAM 2',
        speaker: 'Renan Vianna (Apresentador)',
        targetPerson: 'João Silva',
        eyeDirection: 'Olhar para convidado',
        shotType: 'Plano Médio 45°',
        content: 'Me leva para a manhã seguinte à chuva de março de 2014. Quando você abriu a porta de aço do galpão, o que os seus olhos viram?',
        directionalMarkers: ['TOM GRAVE', 'CORTE → CAM 3', 'SEGURAR PLANO SEM CORTAR'],
        isTeleprompter: false,
        questionRefId: 'q-2',
      },
      {
        id: 'sc-5',
        segmentId: 'seg-5',
        timestamp: '42:00',
        type: 'closing',
        camera: 'CAM 1',
        speaker: 'Renan Vianna (Apresentador)',
        eyeDirection: 'Olhar para lente',
        shotType: 'Plano Médio Frontal',
        content: 'Essa chave número 17 que o João colocou na mesa hoje não é apenas um pedaço de aço. É o símbolo de que a dignidade vale mais do que qualquer crise. Nos vemos na próxima semana no Mentes de Valor.',
        directionalMarkers: ['OLHAR PARA LENTE', 'SUBIR TRILHA'],
        isTeleprompter: true,
      }
    ],
    cameras: defaultInterviewCameras,
    assets: [
      {
        id: 'ast-1',
        segmentId: 'seg-2',
        type: 'foto',
        title: 'Foto da Kombi 1989 com as ferramentas',
        description: 'Foto analógica digitalizada de João com 30 anos ao lado da Kombi.',
        moment: 'Quando João narrar o início das vendas.',
        status: 'obtido',
      },
      {
        id: 'ast-2',
        segmentId: 'seg-3',
        type: 'foto',
        title: 'Manchete de jornal da enchente de 2014',
        description: 'Notícia de jornal sobre o galpão alagado na Rua Jurubatuba.',
        moment: 'Quando João narrar o galpão submerso.',
        status: 'obtido',
      }
    ],
    shorts: [
      {
        id: 'sh-1',
        segmentId: 'seg-3',
        title: 'O dia em que tive R$ 12 na conta e R$ 1,8M em dívidas',
        hook: '"O gerente do banco olhou pra mim e disse: João, você tá liquidado."',
        generatingQuestion: 'O que você viu ao abrir a porta do galpão após a enchente?',
        targetParticipant: 'João Silva',
        estimatedDuration: '50s',
        status: 'Planejado',
      }
    ],
    recordingMarkers: [
      {
        id: 'mk-1',
        timestampSec: 745,
        formattedTime: '00:12:25',
        type: 'momento_forte',
        blockTitle: 'A Grande Ruptura: A Enchente de 2014',
        referenceText: 'João embargou a voz e contou sobre a promessa feita à mãe.',
        comment: 'COLOCAR NO TEASER DO EPISÓDIO!'
      }
    ],
    technicalChecklist: {
      cam1Recording: false,
      cam2Recording: false,
      cam3Recording: false,
      micHost: false,
      micGuest: false,
      audioMonitored: false,
      lighting: false,
      memoryCardsStorage: false,
      batteries: false,
      syncClap: false,
      waterReady: false,
      silentPhones: false,
      customItems: [
        { id: 't-1', label: 'Chave nº 17 posicionada na bancada para o apresentador segurar', done: false }
      ]
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Backward compatibility properties
    host: 'Renan Vianna',
    guestName: 'João Silva',
  },

  // Episode 2: Mandatory Auditorium Program (Programa de Auditório do Netto) - Section 10 & 32
  {
    id: 'ep-aud-1',
    programId: 'prog-2',
    showId: 'prog-2',
    episodeNumber: 1,
    title: 'Especial — Histórias que Inspiram',
    idea: 'Programa de auditório com 200 pessoas. Netto recebe João (fábrica de ferramentas) e Maria (rede Sabor Caseiro). Perguntas da plateia, jogo divertido de adivinhação de produtos, apresentação ao vivo da Banda X tocando seus sucessos e encerramento épico.',
    format: 'Programa de auditório',
    targetDurationMin: 60,
    objective: 'Celebrar o empreendedorismo brasileiro com calor humano, emoção, música ao vivo e interação total com o público.',
    status: 'ready',
    participants: [
      {
        participantId: 'part-aud-1',
        name: 'Netto',
        type: 'Apresentador',
        role: 'Apresentador Principal',
        order: 1,
        isFeatured: false,
        estimatedTimeMin: 60,
      },
      {
        participantId: 'part-aud-2',
        name: 'João',
        type: 'Empresário',
        role: 'Convidado Especial',
        order: 2,
        isFeatured: true,
        estimatedTimeMin: 20,
      },
      {
        participantId: 'part-aud-3',
        name: 'Maria',
        type: 'Empresária',
        role: 'Convidada Especial',
        order: 3,
        isFeatured: true,
        estimatedTimeMin: 20,
      },
      {
        participantId: 'part-aud-4',
        name: 'Banda X',
        type: 'Banda',
        role: 'Atração Musical ao Vivo',
        order: 4,
        isFeatured: true,
        estimatedTimeMin: 15,
        notes: 'Lucas no vocal, Beto na guitarra, Thiago no baixo e Marcelo na bateria.',
      },
      {
        participantId: 'part-aud-5',
        name: 'Plateia do Auditório',
        type: 'Plateia',
        role: 'Participantes / Auditório',
        order: 5,
        isFeatured: false,
        estimatedTimeMin: 60,
      }
    ],
    segments: [
      {
        id: 'seg-aud-1',
        order: 1,
        blockNumber: 1,
        title: '01 — Abertura com Apresentador & Plateia',
        type: 'Abertura',
        estimatedDurationMin: 5,
        participantIds: ['part-aud-1', 'part-aud-5'],
        objective: 'Elevar a energia do auditório, saudar caravanas e anunciar as atrações do programa.',
        suggestedCameraId: 'cam-aud-1',
        transitionText: 'E para abrir a nossa noite de histórias impressionantes, recebam com muito carinho: João e Maria!'
      },
      {
        id: 'seg-aud-2',
        order: 2,
        blockNumber: 2,
        title: '02 — História de João (Da Kombi à Fábrica)',
        type: 'História',
        estimatedDurationMin: 10,
        participantIds: ['part-aud-1', 'part-aud-2'],
        objective: 'Contar a virada de João e a superação da enchente de 2014 com fotos antigas no telão.',
        suggestedCameraId: 'cam-aud-3',
        transitionText: 'Mas não foi só o João que transformou um sonho pequeno numa gigante nacional. Agora é a vez da Maria!'
      },
      {
        id: 'seg-aud-3',
        order: 3,
        blockNumber: 3,
        title: '03 — História de Maria (Do Doce na Faculdade à Rede Nacional)',
        type: 'História',
        estimatedDurationMin: 10,
        participantIds: ['part-aud-1', 'part-aud-3'],
        objective: 'Revelar como Maria começou com R$ 50 vendendo brigadeiros e montou 80 lojas.',
        suggestedCameraId: 'cam-aud-3',
        transitionText: 'Agora o microfone vai para vocês! Hora das perguntas do auditório!'
      },
      {
        id: 'seg-aud-4',
        order: 4,
        blockNumber: 4,
        title: '04 — Perguntas da Plateia',
        type: 'Perguntas da plateia',
        estimatedDurationMin: 8,
        participantIds: ['part-aud-1', 'part-aud-2', 'part-aud-3', 'part-aud-5'],
        objective: 'Microfone no meio da plateia para perguntas espontâneas e emocionantes aos convidados.',
        suggestedCameraId: 'cam-aud-5',
        transitionText: 'E agora chegou a hora da diversão no palco: o Jogo do Preço Certo!'
      },
      {
        id: 'seg-aud-5',
        order: 5,
        blockNumber: 5,
        title: '05 — Jogo / Desafio no Palco',
        type: 'Jogo',
        estimatedDurationMin: 8,
        participantIds: ['part-aud-1', 'part-aud-2', 'part-aud-3', 'part-aud-5'],
        objective: 'Competição leve e divertida com a plateia votando pelo aplicativo ou palmas.',
        suggestedCameraId: 'cam-aud-2',
        transitionText: 'Aumenta o som que o palco vai tremer! Com vocês: Banda X!'
      },
      {
        id: 'seg-aud-6',
        order: 6,
        blockNumber: 6,
        title: '06 — Apresentação da Banda X',
        type: 'Musical',
        estimatedDurationMin: 8,
        participantIds: ['part-aud-4', 'part-aud-5'],
        objective: 'Performance ao vivo do hit principal com iluminação dinâmica e público cantando junto.',
        suggestedCameraId: 'cam-aud-4',
        transitionText: 'Que show espetacular! Vem pra cá, Lucas, vem cá Banda X!'
      },
      {
        id: 'seg-aud-7',
        order: 7,
        blockNumber: 7,
        title: '07 — Conversa com a Banda',
        type: 'Entrevista',
        estimatedDurationMin: 6,
        participantIds: ['part-aud-1', 'part-aud-4'],
        objective: 'Bate-papo descontraído com os integrantes sobre a vida na estrada e novos lançamentos.',
        suggestedCameraId: 'cam-aud-4',
        transitionText: 'Que noite inesquecível! Vamos ao encerramento com todos no palco!'
      },
      {
        id: 'seg-aud-8',
        order: 8,
        blockNumber: 8,
        title: '08 — Encerramento Festivo',
        type: 'Encerramento',
        estimatedDurationMin: 5,
        participantIds: ['part-aud-1', 'part-aud-2', 'part-aud-3', 'part-aud-4', 'part-aud-5'],
        objective: 'Todos no palco cantando o refrão com chuva de confetes e despedida calorosa.',
        suggestedCameraId: 'cam-aud-1',
        transitionText: 'Boa noite a todos, e que vocês nunca desistam dos seus sonhos!'
      }
    ],
    diagnosis: {
      centralTheme: 'A força da perseverança popular demonstrada por heróis do cotidiano com auditório vibrante.',
      potentialStory: 'Vidas reais entrelaçadas pela coragem de começar do zero, celebradas em formato de espetáculo com música.',
      primaryConflict: 'O choque entre a dúvida inicial da família e o triunfo de construir negócios que sustentam centenas de pessoas.',
      primaryTransformation: 'Da solidão das primeiras vendas para a consagração em um auditório lotado aplaudindo de pé.',
      whyWatch: 'Combinação perfeita de emoção, risadas, música de qualidade e identificação com o público.',
      whatToDiscover: 'Histórias inéditas contadas no calor da plateia que nunca sairiam em entrevistas formais.',
      researchPoints: [
        'Organizar fotos antigas de João e Maria para projetar no telão',
        'Alinhar ordem da música da Banda X com a mesa de som e iluminação'
      ],
      highImpactMoments: [
        'A plateia aplaudindo de pé o relato de Maria sobre sua mãe',
        'O solo de guitarra da Banda X com iluminação sincronizada',
        'A pergunta surpresa de uma espectadora da caravana'
      ],
      approved: true,
    },
    research: {
      aboutGuest: 'Programa com múltiplos convidados de peso e atração musical consagrada.',
      trajectory: 'Netto no comando de auditório integrando sofá, pista, banda e arquibancada.',
      company: 'Rede Auditório do Netto.',
      keyDatesAndNumbers: '200 pessoas na plateia | 5 câmeras | 60 minutos de gravação ininterrupta.',
      previousInterviews: '',
      recurringThemes: 'Orgulho do trabalho, música boa e celebração da vida simples.',
      contradictionsAndClarifications: '',
      compellingStories: 'O momento em que Maria reencontra um cliente da época em que vendia na rua.',
      sources: []
    },
    questions: [
      {
        id: 'q-aud-1',
        segmentId: 'seg-aud-2',
        order: 1,
        text: 'João, quando você olhou para aquele galpão alagado e viu que só restava a chave nº 17, quem foi a primeira pessoa que segurou a sua mão?',
        objective: 'Conectar a plateia à emoção genuína do entrevistado.',
        suggestedCamera: 'CAM 3 (Convidados)',
        targetParticipantName: 'João',
        followUps: [
          {
            id: 'fu-aud-1',
            triggerCondition: 'SE A PLATEIA REAGIR COM SUSPIRO OU APLAUSO',
            actionOrQuestion: 'CORTAR PARA CAM 5 (Plateia) para registrar a emoção nos rostos.',
            tag: 'PLATEIA'
          },
          {
            id: 'fu-aud-2',
            triggerCondition: 'SE ELE CHORAR OU SE EMOCIONAR',
            actionOrQuestion: 'NÃO INTERROMPER. Netto se aproxima com a mão no ombro.',
            tag: 'NÃO INTERROMPER'
          }
        ]
      },
      {
        id: 'q-aud-2',
        segmentId: 'seg-aud-3',
        order: 1,
        text: 'Maria, é verdade que quando você foi ao primeiro banco pedir máquina de cartão, riram da sua cara dizendo que brigadeiro não dava dinheiro?',
        objective: 'Gerar cumplicidade e revolta saudável com final vitorioso.',
        suggestedCamera: 'CAM 3 (Convidados)',
        targetParticipantName: 'Maria',
        followUps: [
          {
            id: 'fu-aud-3',
            triggerCondition: 'SE A PLATEIA VAIAR O BANCO',
            actionOrQuestion: 'Netto brinca: "E hoje o gerente é cliente dela!"',
            tag: 'CONFLITO'
          }
        ]
      },
      {
        id: 'q-aud-3',
        segmentId: 'seg-aud-7',
        order: 1,
        text: 'Lucas, vocês começaram tocando em garagem sem acústica com os vizinhos chamando a polícia. Como é hoje ver 200 pessoas cantando o refrão de vocês?',
        objective: 'Celebrar a jornada da banda independente.',
        suggestedCamera: 'CAM 4 (Banda)',
        targetParticipantName: 'Banda X',
        followUps: [
          {
            id: 'fu-aud-4',
            triggerCondition: 'SE O BATERISTA FAZER UMA VIRADA',
            actionOrQuestion: 'CORTAR PARA DETALHE DO PRATO DE BATERIA NA CAM 4',
            tag: 'APROFUNDAR'
          }
        ]
      }
    ],
    script: [
      {
        id: 'sc-aud-1',
        segmentId: 'seg-aud-1',
        timestamp: '00:00',
        type: 'opening',
        camera: 'CAM 1 (Geral Auditório)',
        speaker: 'Netto (Apresentador)',
        eyeDirection: 'Olhar para a câmera frontal e abrir os braços para a plateia',
        shotType: 'Plano Geral com Grua descendo',
        content: 'Boa noite, minha gente querida! Sejam todos muito bem-vindos ao Programa de Auditório do Netto! Hoje nós temos histórias de arrepiar, jogos com prêmios e a nossa queridíssima Banda X ao vivo no palco!',
        directionalMarkers: ['COLD OPEN', 'AUMENTAR PALMAS DA PLATEIA', 'CAM 5 REAÇÕES DA PLATEIA'],
        isTeleprompter: true,
      },
      {
        id: 'sc-aud-2',
        segmentId: 'seg-aud-2',
        timestamp: '05:15',
        type: 'question',
        camera: 'CAM 2 (Apresentador)',
        speaker: 'Netto (Apresentador)',
        targetPerson: 'João',
        eyeDirection: 'Olhar para o sofá dos convidados',
        shotType: 'Plano Médio 45°',
        content: 'João, me conta: quando você olhou aquele galpão todo debaixo d’água em 2014, o que te fez levantar na manhã seguinte?',
        directionalMarkers: ['CORTE IMEDIATO → CAM 3 (Convidados)', 'SE EMOÇÃO, MANTER CAM 3'],
        isTeleprompter: false,
        questionRefId: 'q-aud-1',
      },
      {
        id: 'sc-aud-3',
        segmentId: 'seg-aud-3',
        timestamp: '15:20',
        type: 'question',
        camera: 'CAM 2 (Apresentador)',
        speaker: 'Netto (Apresentador)',
        targetPerson: 'Maria',
        eyeDirection: 'Olhar para Maria',
        shotType: 'Plano Médio',
        content: 'Maria, é verdade que riram de você quando você disse que ia abrir uma rede de 80 lojas vendendo doces caseiros?',
        directionalMarkers: ['CORTE → CAM 3 (Maria)', 'CORTE → CAM 5 (Risos Plateia)'],
        isTeleprompter: false,
        questionRefId: 'q-aud-2',
      },
      {
        id: 'sc-aud-4',
        segmentId: 'seg-aud-6',
        timestamp: '41:00',
        type: 'musical_performance',
        camera: 'CAM 4 (Banda)',
        speaker: 'Banda X',
        eyeDirection: 'Lucas olhando para a lente da CAM 4',
        shotType: 'Plano Médio Dinâmico com travelling',
        content: '[ BANDA X EXECUTA SEU MAIOR HIT - GUITARRAS ENÉRGICAS E PLATEIA PULANDO ]',
        directionalMarkers: ['LUZ ESTROBO', 'CORTE ALTERNADO: CAM 4 BANDA ↔ CAM 5 PLATEIA', 'SUBIR ÁUDIO MASTER'],
        isTeleprompter: false,
      },
      {
        id: 'sc-aud-5',
        segmentId: 'seg-aud-8',
        timestamp: '55:30',
        type: 'closing',
        camera: 'CAM 1 (Geral Auditório)',
        speaker: 'Netto (Apresentador)',
        eyeDirection: 'Olhar para lente central, abraçando os convidados',
        shotType: 'Plano Aberto Geral Festivo',
        content: 'E assim nós terminamos mais um sábado de muita verdade, suor e música boa! Obrigado a cada caravana que veio de longe, aos nossos guerreiros João e Maria, e à Banda X! Acreditem no sonho de vocês! Até semana que vem!',
        directionalMarkers: ['CHUVA DE CONFETES', 'TRILHA DA BANDA DE FUNDO', 'SUBIR CRÉDITOS NA TELA', 'APLAUSOS DA PLATEIA NO MÁXIMO'],
        isTeleprompter: true,
      }
    ],
    cameras: auditoriumCameras,
    assets: [
      {
        id: 'ast-aud-1',
        segmentId: 'seg-aud-2',
        type: 'foto',
        title: 'Fotos da primeira Kombi de João projetadas no telão',
        description: 'Imagens em alta resolução para exibição no painel de LED atrás do sofá.',
        moment: 'Durante o relato de João.',
        status: 'aprovado'
      },
      {
        id: 'ast-aud-2',
        segmentId: 'seg-aud-6',
        type: 'musica',
        title: 'Mapa de canais de áudio da Banda X',
        description: '16 canais de entrada com bateria microfonada, baixo linha, 2 guitarras e 3 vocais.',
        moment: 'Passagem de som às 14h.',
        status: 'aprovado'
      }
    ],
    shorts: [
      {
        id: 'sh-aud-1',
        segmentId: 'seg-aud-3',
        title: 'O dia em que riram da mulher que criou 80 lojas',
        hook: '"Disseram que vender brigadeiro era coisa de desocupado. Hoje eu faturo R$ 30 milhões."',
        generatingQuestion: 'O que o banco disse quando você pediu a primeira máquina de cartão?',
        targetParticipant: 'Maria',
        estimatedDuration: '45s',
        status: 'Planejado'
      },
      {
        id: 'sh-aud-2',
        segmentId: 'seg-aud-6',
        title: 'A energia da Banda X levando a plateia à loucura',
        hook: '"Quando a guitarra entra, ninguém consegue ficar sentado!"',
        generatingQuestion: 'Como foi o solo ao vivo no palco do Netto?',
        targetParticipant: 'Banda X',
        estimatedDuration: '30s',
        status: 'Planejado'
      }
    ],
    recordingMarkers: [],
    technicalChecklist: {
      cam1Recording: false,
      cam2Recording: false,
      cam3Recording: false,
      micHost: false,
      micGuest: false,
      audioMonitored: false,
      lighting: false,
      memoryCardsStorage: false,
      batteries: false,
      syncClap: false,
      waterReady: false,
      silentPhones: false,
      customItems: [
        { id: 't-aud-1', label: 'Monitor de ponto e retorno de fone do Netto testado', done: false },
        { id: 't-aud-2', label: 'Passagem de som da Banda X aprovada pela mesa de PA e monitor', done: false },
        { id: 't-aud-3', label: 'Microfone sem fio da plateia testado e com baterias novas', done: false },
        { id: 't-aud-4', label: 'Telão de LED curvo configurado com as fotos dos convidados', done: false }
      ]
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    host: 'Netto',
    guestName: 'João, Maria, Banda X, Plateia',
  }
];

// --- Seed Agenda Events ---
export const seedAgenda: AgendaEvent[] = [
  {
    id: 'ag-1',
    type: 'recording',
    episodeId: 'ep-1',
    programTitle: 'Mentes de Valor',
    episodeTitle: 'Da Kombi Velha à Fábrica de 400 Funcionários',
    date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
    time: '14:30',
    durationMin: 45,
    location: 'Estúdio Principal A (TakeMaster)',
    status: 'confirmado',
    participantsSummary: 'Renan Vianna (Host), João Silva (Convidado)',
  },
  {
    id: 'ag-2',
    type: 'recording',
    episodeId: 'ep-aud-1',
    programTitle: 'Programa de Auditório do Netto',
    episodeTitle: 'Especial — Histórias que Inspiram',
    date: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10),
    time: '19:00',
    durationMin: 90,
    location: 'Auditório Master (Palco & Plateia)',
    status: 'confirmado',
    participantsSummary: 'Netto (Host), João, Maria, Banda X (4 membros), Plateia (200 pax)',
  }
];

// --- Seed Library Assets ---
export const seedLibrary: LibraryAsset[] = [
  {
    id: 'lib-1',
    programId: 'prog-1',
    title: 'Vinheta de Abertura Mentes de Valor (4K)',
    category: 'vinheta',
    description: 'Abertura em motion design dourado/âmbar com trilha percussiva de alta intensidade.',
    tags: ['abertura', 'motion', '4k', 'mentes de valor']
  },
  {
    id: 'lib-2',
    programId: 'prog-2',
    title: 'Lettering & GC Animado Auditório do Netto',
    category: 'gc_template',
    description: 'Identificador inferior animado com nome, função e rede social para convidados.',
    tags: ['gc', 'lower third', 'auditório', 'ao vivo']
  },
  {
    id: 'lib-3',
    programId: 'prog-2',
    title: 'Trilha de Suspense para o Jogo no Palco',
    category: 'trilha',
    description: 'Música orquestrada de tensão com contagem regressiva de 30 segundos para dinâmicas.',
    tags: ['jogo', 'quiz', 'suspense', 'audio']
  },
  {
    id: 'lib-4',
    title: 'Template de Roteiro: Formato Mesa Redonda (4 Câmeras)',
    category: 'roteiro_modelo',
    description: 'Estrutura completa com mediação de apresentador e 3 debatedores com cortes cruzados.',
    tags: ['template', 'mesa redonda', 'debate']
  }
];

/** Ordem de carga: cameras e filhas de programs, participantes antes de
 * episodes, episodes antes da agenda (agenda_events.episode_id e FK).
 * saveProgram/saveEpisode ja gravam os filhos na mesma transacao, entao a
 * ordem abaixo e apenas de legibilidade. */
export const seedOrder = [
  'programs',
  'participants',
  'episodes',
  'agendaEvents',
  'libraryAssets',
] as const;
