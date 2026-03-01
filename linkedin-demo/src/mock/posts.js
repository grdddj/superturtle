const createMockTimestamp = (minutesAgo) => ({
  toDate: () => new Date(Date.now() - minutesAgo * 60 * 1000),
});

export const mockUsers = {
  alex: {
    username: "Alex Turner",
    profile: "https://i.pravatar.cc/200?img=68",
    title: "🐢 Full-Stack Developer | Building things that matter",
  },
  avery: {
    username: "Avery Chen",
    profile: "https://i.pravatar.cc/200?img=12",
    title: "Design Systems Lead @ Figma's Fever Dream",
  },
  devin: {
    username: "Devin Carter",
    profile: "https://i.pravatar.cc/200?img=33",
    title: "Frontend Engineer | div Alignment Specialist",
  },
  sofia: {
    username: "Sofia Morales",
    profile: "https://i.pravatar.cc/200?img=44",
    title: "Product Marketing | Making Decks Nobody Reads",
  },
};

export const mockPosts = [
  {
    id: "mock-post-1",
    data: {
      profile: mockUsers.alex.profile,
      username: mockUsers.alex.username,
      timestamp: createMockTimestamp(8),
      description:
        "Excited to share that our team shipped a major onboarding improvement this week. We focused on reducing friction in the first five minutes of product use, and early signals are promising.\n\nGreat outcomes come from close collaboration across product, design, and engineering.",
      fileType: null,
      fileData: null,
    },
  },
  {
    id: "mock-post-2",
    data: {
      profile: mockUsers.avery.profile,
      username: mockUsers.avery.username,
      timestamp: createMockTimestamp(17),
      description:
        "We completed a refresh of our design system primitives and documentation. The biggest win was aligning on consistent spacing and typography tokens, which sped up handoff and reduced UI drift.\n\nSmall standards create big leverage over time.",
      fileType: "image",
      fileData: "https://picsum.photos/id/1015/1200/700",
    },
  },
  {
    id: "mock-post-3",
    data: {
      profile: mockUsers.devin.profile,
      username: mockUsers.devin.username,
      timestamp: createMockTimestamp(35),
      description:
        "Spent today improving frontend performance by auditing render paths and trimming unnecessary re-renders. We were able to cut page interaction latency significantly on lower-end devices.\n\nPerformance work is invisible when done well, but users feel it immediately.",
      fileType: null,
      fileData: null,
    },
  },
  {
    id: "mock-post-4",
    data: {
      profile: mockUsers.sofia.profile,
      username: mockUsers.sofia.username,
      timestamp: createMockTimestamp(62),
      description:
        "Wrapped a round of customer interviews this week. A recurring theme was clarity: users value simple workflows and clear next steps over feature depth.\n\nTurning this into a focused messaging update for the next release.",
      fileType: null,
      fileData: null,
    },
  },
  {
    id: "mock-post-5",
    data: {
      profile: mockUsers.alex.profile,
      username: mockUsers.alex.username,
      timestamp: createMockTimestamp(95),
      description:
        "Quick reflection: strong engineering culture is built through consistent code reviews, clear ownership, and steady delivery habits.\n\nTools matter, but team trust and communication matter more. Proud of the momentum we are building.",
      fileType: "image",
      fileData: "https://picsum.photos/id/1025/1200/700",
    },
  },
  {
    id: "mock-post-6",
    data: {
      profile: mockUsers.avery.profile,
      username: mockUsers.avery.username,
      timestamp: createMockTimestamp(130),
      description:
        "One principle I keep coming back to: good design reduces decision fatigue. When patterns are predictable and language is clear, teams ship faster and users feel more confident.\n\nDesign quality scales when systems are treated as shared product infrastructure.",
      fileType: null,
      fileData: null,
    },
  },
  {
    id: "mock-post-7",
    data: {
      profile: mockUsers.devin.profile,
      username: mockUsers.devin.username,
      timestamp: createMockTimestamp(188),
      description:
        "We wrapped a cleanup sprint focused on maintainability. Reduced dead code, simplified styling patterns, and improved component boundaries.\n\nThe product looks the same, but the codebase is healthier and easier to extend.",
      fileType: null,
      fileData: null,
    },
  },
  {
    id: "mock-post-8",
    data: {
      profile: mockUsers.sofia.profile,
      username: mockUsers.sofia.username,
      timestamp: createMockTimestamp(255),
      description:
        "Finalized our quarterly go-to-market narrative and aligned it with current product capabilities. The strongest message came from real customer outcomes, not feature lists.\n\nClear positioning helps every team move in the same direction.",
      fileType: "image",
      fileData: "https://picsum.photos/id/1043/1200/700",
    },
  },
  {
    id: "mock-post-9",
    data: {
      profile: mockUsers.alex.profile,
      username: mockUsers.alex.username,
      timestamp: createMockTimestamp(320),
      description:
        "Career growth reminder: impactful work is rarely linear. The most valuable projects in my journey were the ones that required cross-functional collaboration and continuous learning.\n\nKeep building, keep iterating, and share what you learn with others.",
      fileType: null,
      fileData: null,
    },
  },
];
