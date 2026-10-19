"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DataTable, DataTableActions } from "@/components/admin/DataTable";
import { MemberRecordTables } from "@/components/admin/MemberRecordTables";
import { SeaServiceSection } from "@/components/records/SeaServiceSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { memberDeactivateBlock, memberWorkOrderBlock } from "@/lib/admin/rules";
import { userFormSchema, type UserFormValues } from "@/lib/admin/schema";
import {
	memberName,
	ROLE_LABELS,
	ROLES,
	type Assignment,
	type Member,
	type Role,
	type ServiceRecord,
	type Vessel,
} from "@/lib/session/types";
import type { WorkOrder } from "@/lib/work-orders/types";

const roleItems = Object.fromEntries(
	ROLES.map((role) => [role, ROLE_LABELS[role]]),
);

function emptyUserForm(): UserFormValues {
	return {
		firstName: "",
		lastName: "",
		role: "" as UserFormValues["role"],
	};
}

export function UsersSection({
	members,
	vessels,
	assignments,
	serviceRecords,
	orders,
	onSave,
	onSetActive,
}: {
	members: Member[];
	vessels: Vessel[];
	assignments: Assignment[];
	serviceRecords: ServiceRecord[];
	orders: WorkOrder[];
	onSave: (input: {
		id?: string;
		firstName: string;
		lastName: string;
		role: Role;
		serviceRecords: ServiceRecord[];
	}) => string | null;
	onSetActive: (memberId: string, active: boolean) => string | null;
}) {
	const [open, setOpen] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);
	const [pending, setPending] = useState<{
		title: string;
		description: string;
		confirmLabel: string;
		run: () => void;
	} | null>(null);
	const [query, setQuery] = useState("");
	const [serviceDrafts, setServiceDrafts] = useState<ServiceRecord[]>([]);
	const normalizedQuery = query.trim().toLowerCase();
	const visibleMembers = normalizedQuery
		? members.filter(
				(member) =>
					member.firstName.toLowerCase().includes(normalizedQuery) ||
					member.lastName.toLowerCase().includes(normalizedQuery),
			)
		: members;
	const {
		control,
		register,
		handleSubmit,
		reset,
		setError,
		clearErrors,
		formState: { errors },
	} = useForm<UserFormValues>({
		resolver: zodResolver(userFormSchema),
		defaultValues: emptyUserForm(),
	});
	const selectedRole = useWatch({ control, name: "role" });
	const showRecords = selectedRole === "captain" || selectedRole === "crew";

	function closeModal() {
		setOpen(false);
		setEditingId(null);
		setServiceDrafts([]);
		reset(emptyUserForm());
	}

	function openAdd() {
		setEditingId(null);
		setServiceDrafts([]);
		reset(emptyUserForm());
		setOpen(true);
	}

	function openEdit(member: Member) {
		setEditingId(member.id);
		setServiceDrafts(
			serviceRecords
				.filter((record) => record.memberId === member.id)
				.map((record) => ({ ...record })),
		);
		reset({
			firstName: member.firstName,
			lastName: member.lastName,
			role: member.role,
		});
		setOpen(true);
	}

	function onValid(values: UserFormValues) {
		const message = onSave({
			id: editingId ?? undefined,
			firstName: values.firstName,
			lastName: values.lastName,
			role: values.role,
			serviceRecords: serviceDrafts,
		});
		if (message) {
			setError("root", { message });
			return;
		}
		closeModal();
	}

	return (
			<section className="min-w-0 max-w-full rounded-xl border bg-card max-md:overflow-x-auto">
			<div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b px-4 py-3 md:flex md:items-center md:justify-between">
				<div>
					<h2 className="text-base font-semibold">Users</h2>
					<p className="text-sm text-muted-foreground">
						{members.length} {members.length === 1 ? "user" : "users"}
					</p>
				</div>
				<Button type="button" className="md:order-last" onClick={openAdd}>
					Add user
				</Button>
				<div className="col-span-2 md:col-auto">
					<Label htmlFor="user-search" className="sr-only">
						Search
					</Label>
					<Input
						id="user-search"
						value={query}
						placeholder="Search first or last name"
						className="w-full md:w-56"
						onChange={(event) => setQuery(event.target.value)}
					/>
				</div>
			</div>
			{actionError ? (
				<p role="alert" className="border-b px-4 py-3 text-sm text-destructive">
					{actionError}
				</p>
			) : null}
			<DataTable
				minWidth="min-w-[47rem]"
				empty={normalizedQuery ? "No matching users." : "No users yet."}
				rows={visibleMembers}
				getRowKey={(member) => member.id}
				isSelected={(member) => open && member.id === editingId}
				columns={[
					{
						header: "First name",
						cellClassName: "font-medium",
						value: (member) => member.firstName,
						cell: (member) => member.firstName,
					},
					{
						header: "Last name",
						value: (member) => member.lastName,
						cell: (member) => member.lastName,
					},
					{
						header: "Role",
						width: "w-36",
						value: (member) => ROLE_LABELS[member.role],
						cell: (member) => ROLE_LABELS[member.role],
					},
					{
						header: "Status",
						width: "w-32",
						value: (member) => (member.active ? "Active" : "Inactive"),
						cell: (member) => (
							<Badge variant={member.active ? "active" : "inactive"}>
								{member.active ? "Active" : "Inactive"}
							</Badge>
						),
					},
					{
						header: "Actions",
						width: "w-64",
						align: "center",
						cell: (member) => (
							<DataTableActions
								actions={[
									{
										label: "Edit",
										onClick: () => openEdit(member),
									},
									{
										label: member.active ? "Deactivate" : "Activate",
										variant: member.active ? "destructive" : "success",
										onClick: () => {
											const name = memberName(member);
											const nextActive = !member.active;
											if (!nextActive) {
												const message = memberDeactivateBlock(
													{
														vessels,
														members,
														assignments,
														serviceRecords: [],
														seaServices: [],
													},
													member.id,
												);
												if (message) {
													setActionError(message);
													return;
												}
												const workMessage = memberWorkOrderBlock(
													orders,
													member.id,
													name,
												);
												if (workMessage) {
													setActionError(workMessage);
													return;
												}
											}
											setActionError(null);
											setPending({
												title: nextActive ? "Activate user" : "Deactivate user",
												description: nextActive
													? `Activate ${name}?`
													: `Deactivate ${name}?`,
												confirmLabel: nextActive ? "Activate" : "Deactivate",
												run: () =>
													setActionError(onSetActive(member.id, nextActive)),
											});
										},
									},
								]}
							/>
						),
					},
				]}
			/>
			<Dialog
				open={open}
				onOpenChange={(next) => {
					if (!next) {
						closeModal();
						return;
					}
					setOpen(true);
				}}
			>
				<DialogContent
					className={
						showRecords
							? "max-h-[calc(100dvh-2rem)] min-w-0 overflow-x-hidden overflow-y-auto sm:max-w-[min(64rem,calc(100%-2rem))]"
							: "sm:max-w-md"
					}
				>
					<DialogHeader>
						<DialogTitle>{editingId ? "Edit user" : "Add user"}</DialogTitle>
						<DialogDescription>
							Enter a first name, last name, and role.
						</DialogDescription>
					</DialogHeader>
					<form
						id="user-form"
						onSubmit={handleSubmit(onValid, () => clearErrors("root"))}
						className="flex flex-col gap-3"
					>
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="flex flex-col gap-1">
								<Label htmlFor="user-first-name">First name</Label>
								<Input
									id="user-first-name"
									aria-invalid={errors.firstName !== undefined}
									{...register("firstName")}
								/>
								{errors.firstName ? (
									<p className="text-sm text-destructive">
										{errors.firstName.message}
									</p>
								) : null}
							</div>
							<div className="flex flex-col gap-1">
								<Label htmlFor="user-last-name">Last name</Label>
								<Input
									id="user-last-name"
									aria-invalid={errors.lastName !== undefined}
									{...register("lastName")}
								/>
								{errors.lastName ? (
									<p className="text-sm text-destructive">
										{errors.lastName.message}
									</p>
								) : null}
							</div>
						</div>
						<div className="flex flex-col gap-1">
							<Label htmlFor="user-role">Role</Label>
							<Controller
								name="role"
								control={control}
								render={({ field }) => (
									<Select
										items={roleItems}
										value={field.value ? field.value : null}
										onValueChange={(value) => {
											if (
												value === "admin" ||
												value === "captain" ||
												value === "crew"
											) {
												field.onChange(value);
											}
										}}
									>
										<SelectTrigger id="user-role" className="w-full">
											<SelectValue placeholder="Select a role" />
										</SelectTrigger>
										<SelectContent>
											{ROLES.map((item) => (
												<SelectItem key={item} value={item}>
													{ROLE_LABELS[item]}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
							{errors.role ? (
								<p className="text-sm text-destructive">
									{errors.role.message}
								</p>
							) : null}
						</div>
						{errors.root?.message ? (
							<p role="alert" className="text-sm text-destructive">
								{errors.root.message}
							</p>
						) : null}
					</form>
					{showRecords ? (
						<MemberRecordTables
							vessels={vessels}
							serviceRecords={serviceDrafts}
							onServiceRecordsChange={setServiceDrafts}
						/>
					) : null}
					{showRecords && editingId ? (
						<SeaServiceSection scope="directory" memberId={editingId} embedded />
					) : null}
					<DialogFooter>
						<Button type="button" variant="outline" onClick={closeModal}>
							Cancel
						</Button>
						<Button type="submit" form="user-form">
							{editingId ? "Save user" : "Add user"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<ConfirmDialog
				open={pending !== null}
				title={pending?.title ?? ""}
				description={pending?.description ?? ""}
				confirmLabel={pending?.confirmLabel ?? "Confirm"}
				onOpenChange={(next) => {
					if (!next) {
						setPending(null);
					}
				}}
				onConfirm={() => {
					const current = pending;
					setPending(null);
					current?.run();
				}}
			/>
		</section>
	);
}
