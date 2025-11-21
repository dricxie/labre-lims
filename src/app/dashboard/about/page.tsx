'use client';

import { Code2, Cpu, FlaskConical, ShieldCheck } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

type Pillar = {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  copy: string;
};

const PILLARS: Pillar[] = [
  {
    icon: FlaskConical,
    title: 'Lab-native UX',
    copy: 'Workflows are mapped to wet-lab rituals – from sample intake to complex assay review.'
  },
  {
    icon: Cpu,
    title: 'Automation ready',
    copy: 'Connect instruments, robots, and analytics pipelines with auditable actions.'
  },
  {
    icon: ShieldCheck,
    title: 'Compliance by design',
    copy: 'Fine-grained RBAC, immutable audit logs, and SOP enforcement built-in.'
  },
  {
    icon: Code2,
    title: 'Extensible core',
    copy: 'Composable UI primitives plus API hooks let teams tailor LabRe to their lab stack.'
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="About LabRe"
        description="A minimalist, automation-ready LIMS crafted for modern biomolecular labs."
      />

      <Card>
        <CardHeader>
          <CardTitle>Our mission</CardTitle>
          <CardDescription>
            Give every scientist a calm cockpit for experiments, operations, and compliance without the noise.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            LabRe is a lightweight Laboratory Information Management System that blends the clarity of analytics dashboards
            with the rigor laboratories require. From tracking sample journeys to orchestrating SOP adherence, we focus on
            creating interfaces that stay out of the way so lab teams can focus on breakthrough work.
          </p>
          <p>
            Built with React, Firebase, and carefully curated components, LabRe embraces responsive design principles and
            dark/light themes out of the box. Every surface is intentionally sparse, making it easy to plug in new modules
            as your lab grows.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {PILLARS.map((pillar) => (
          <Card key={pillar.title} className="h-full">
            <CardHeader className="flex flex-row items-start gap-3">
              <div className="rounded-xl bg-muted p-2 text-muted-foreground">
                <pillar.icon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">{pillar.title}</CardTitle>
                <CardDescription>{pillar.copy}</CardDescription>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>In the lab, clarity matters.</CardTitle>
          <CardDescription>
            LabRe keeps navigation consistent, typography restrained, and palettes calm so your data stands out.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            This release focuses on a minimalist shell inspired by Supabase’s dashboard: a static header, hover-elevated
            sidebar rail, and content canvas that never jitters when menus expand. Components reuse the same tokens, so
            theming is effortless.
          </p>
          <Separator />
          <p>
            Want to collaborate or suggest improvements? Drop an issue in the tracker or reach out to the LabRe core team.
            We build in the open and welcome contributions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
