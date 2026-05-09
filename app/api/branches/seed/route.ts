import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/serverDb";

const DEFAULT_BRANCHES = [
  { name: "NYAISHOZI BRANCH",  location: "Nyaishozi" },
  { name: "KAYANGA BRANCH",    location: "Kayanga"   },
  { name: "MIKOCHENI BRANCH",  location: "Mikocheni, Dar es Salaam" },
  { name: "DODOMA BRANCH",     location: "Dodoma"    },
  { name: "MBEYA BRANCH",      location: "Mbeya"     },
  { name: "MWANZA BRANCH",     location: "Mwanza"    },
  { name: "ARUSHA BRANCH",     location: "Arusha"    },
  { name: "KAHAMA BRANCH",     location: "Kahama"    },
  { name: "TEMEKE BRANCH",     location: "Temeke, Dar es Salaam" },
  { name: "ILALA BRANCH",      location: "Ilala, Dar es Salaam"  },
  { name: "MOSHI BRANCH",      location: "Moshi"     },
  { name: "IRINGA BRANCH",     location: "Iringa"    },
];

interface Branch {
  id: string; companyId: string; name: string;
  location: string; managerId: string; allowedIPs?: string;
}

export async function POST() {
  try {
    const branches = readDb<Branch[]>("branches", []);
    let added = 0;

    for (const def of DEFAULT_BRANCHES) {
      const exists = branches.some(
        b => b.name.trim().toUpperCase() === def.name.toUpperCase()
      );
      if (!exists) {
        branches.push({
          id: `branch_default_${def.name.toLowerCase().replace(/\s+/g, "_")}`,
          companyId: "group",
          name: def.name,
          location: def.location,
          managerId: "",
          allowedIPs: "",
        });
        added++;
      }
    }

    writeDb("branches", branches);
    return NextResponse.json({ added, total: branches.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
