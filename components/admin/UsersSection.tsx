"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { DataTable, DataTableActions } from "@/components/admin/DataTable";
import { RecordStatus } from "@/components/admin/RecordStatus";
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
import { userFormSchema, type UserFormValues } from "@/lib/admin/schema";
import {
	ROLE_LABELS,
	ROLES,
	type Member,
	type Role,
} from "@/lib/session/types";

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
	onSave,
	onSetActive,
}: {
	members: Member[];
	onSave: (input: {
		id?: string;
		firstName: string;
		lastName: string;
		role: Role;
	}) => string | null;
	onSetActive: (memberId: string, active: boolean) => string | null;
}) {
	const [open, setOpen] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);
	const [query, setQuery] = useState("");
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

	function closeModal() {
		setOpen(false);
		setEditingId(null);
		reset(emptyUserForm());
	}

	function openAdd() {
		setEditingId(null);
		reset(emptyUserForm());
		setOpen(true);
	}

	function openEdit(member: Member) {
		setEditingId(member.id);
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
		});
		if (message) {
			setError("root", { message });
			return;
		}
		closeModal();
	}

	return (
		<section className="overflow-hidden rounded-xl border bg-card">
			<div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:items-center md:justify-between border-b px-4 py-3">
				<div>
					<h2 className="text-base font-semibold">Users</h2>
					<p className="text-sm text-muted-foreground">
						{members.length} {members.length === 1 ? "user" : "users"}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Label htmlFor="user-search" className="sr-only">
						Search
					</Label>
					<Input
						id="user-search"
						value={query}
						placeholder="Search first or last name"
						className="w-56"
						onChange={(event) => setQuery(event.target.value)}
					/>
					<Button type="button" onClick={openAdd}>
						Add user
					</Button>
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
						cell: (member) => <RecordStatus active={member.active} />,
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
										onClick: () =>
											setActionError(onSetActive(member.id, !member.active)),
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
				<DialogContent className="sm:max-w-md">
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
						<DialogFooter>
							<Button type="button" variant="outline" onClick={closeModal}>
								Cancel
							</Button>
							<Button type="submit">
								{editingId ? "Save user" : "Add user"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</section>
	);
}
