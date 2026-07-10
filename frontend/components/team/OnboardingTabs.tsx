'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCreateTeam, useJoinTeam } from '@/hooks/useTeams';

const createTeamSchema = z.object({
  name: z.string().min(1, 'Required').max(80, 'Must be 80 characters or fewer'),
});

const joinTeamSchema = z.object({
  inviteCode: z.string().length(6, 'Must be exactly 6 characters'),
});

function CreateTeamForm() {
  const router = useRouter();
  const createTeam = useCreateTeam();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof createTeamSchema>>({
    resolver: zodResolver(createTeamSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createTeam.mutateAsync(values.name);
      toast.success('Team created');
      router.push('/products');
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Something went wrong',
      );
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="team-name">Team name</FieldLabel>
        <Input id="team-name" placeholder="Acme Inc." {...register('name')} />
        <FieldError errors={[errors.name]} />
      </Field>
      <Button type="submit" className="w-full" disabled={createTeam.isPending}>
        {createTeam.isPending ? 'Creating...' : 'Create team'}
      </Button>
    </form>
  );
}

function JoinTeamForm() {
  const router = useRouter();
  const joinTeam = useJoinTeam();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof joinTeamSchema>>({
    resolver: zodResolver(joinTeamSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await joinTeam.mutateAsync(values.inviteCode);
      toast.success('Joined team');
      router.push('/products');
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Something went wrong',
      );
    }
  });

  const { onChange: rhfOnChange, ...inviteCodeField } = register('inviteCode');

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="invite-code">Invite code</FieldLabel>
        <Input
          id="invite-code"
          placeholder="ABC123"
          maxLength={6}
          autoCapitalize="characters"
          {...inviteCodeField}
          onChange={(e) => {
            e.target.value = e.target.value.toUpperCase().replace(/\s/g, '');
            rhfOnChange(e);
          }}
        />
        <FieldError errors={[errors.inviteCode]} />
      </Field>
      <Button type="submit" className="w-full" disabled={joinTeam.isPending}>
        {joinTeam.isPending ? 'Joining...' : 'Join team'}
      </Button>
    </form>
  );
}

export function OnboardingTabs() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome</CardTitle>
        <CardDescription>
          Create a new team or join one with an invite code.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="create">
          <TabsList className="w-full">
            <TabsTrigger value="create" className="flex-1">
              Create a team
            </TabsTrigger>
            <TabsTrigger value="join" className="flex-1">
              Join a team
            </TabsTrigger>
          </TabsList>
          <TabsContent value="create" className="pt-4">
            <CreateTeamForm />
          </TabsContent>
          <TabsContent value="join" className="pt-4">
            <JoinTeamForm />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
