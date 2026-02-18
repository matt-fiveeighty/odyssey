"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Plus,
  UserPlus,
  Shield,
  AlertCircle,
  Check,
  X,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { STATES_MAP } from "@/lib/constants/states";
import { SPECIES_MAP } from "@/lib/constants/species";

interface GroupMember {
  id: string;
  name: string;
  email?: string;
  points: number;
  role: "leader" | "member";
  status: "accepted" | "invited" | "declined";
}

interface GroupApp {
  id: string;
  stateId: string;
  speciesId: string;
  unitCode?: string;
  year: number;
  status: "forming" | "submitted" | "drawn" | "unsuccessful";
  members: GroupMember[];
  notes?: string;
}

const STATUS_CONFIG = {
  forming: { label: "Forming", color: "text-blue-400", bg: "bg-blue-400/10" },
  submitted: { label: "Submitted", color: "text-amber-400", bg: "bg-amber-400/10" },
  drawn: { label: "Drawn!", color: "text-green-400", bg: "bg-green-400/10" },
  unsuccessful: { label: "Not Drawn", color: "text-muted-foreground", bg: "bg-secondary" },
};

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupApp[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Create form state
  const [newStateId, setNewStateId] = useState("");
  const [newSpeciesId, setNewSpeciesId] = useState("");
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newNotes, setNewNotes] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  function createGroup() {
    if (!newStateId || !newSpeciesId) return;
    const group: GroupApp = {
      id: crypto.randomUUID(),
      stateId: newStateId,
      speciesId: newSpeciesId,
      year: newYear,
      status: "forming",
      members: [
        {
          id: "me",
          name: "You",
          points: 0,
          role: "leader",
          status: "accepted",
        },
      ],
      notes: newNotes || undefined,
    };
    setGroups((prev) => [...prev, group]);
    setShowCreateModal(false);
    setNewStateId("");
    setNewSpeciesId("");
    setNewNotes("");
  }

  function inviteMember(groupId: string) {
    if (!inviteEmail.trim()) return;
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              members: [
                ...g.members,
                {
                  id: crypto.randomUUID(),
                  name: inviteEmail.split("@")[0],
                  email: inviteEmail,
                  points: 0,
                  role: "member" as const,
                  status: "invited" as const,
                },
              ],
            }
          : g
      )
    );
    setInviteEmail("");
  }

  function removeMember(groupId: string, memberId: string) {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, members: g.members.filter((m) => m.id !== memberId) }
          : g
      )
    );
  }

  return (
    <div className="p-6 space-y-6 fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Group Applications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize group hunts, pool points, and track party applications
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4" />
          New Group
        </Button>
      </div>

      {/* Feasibility Info */}
      <Card className="bg-amber-400/5 border-amber-400/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-400">
                Group Application Rules Vary by State
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Each state has different rules for group applications — max party
                size, point pooling, and whether group draw is even available.
                Check state regulations before forming a group.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Group List */}
      {groups.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              No groups yet
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Create a group application to coordinate with hunting partners.
              Track everyone&apos;s points, check state feasibility, and manage your
              party.
            </p>
            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Your First Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const state = STATES_MAP[group.stateId];
            const species = SPECIES_MAP[group.speciesId];
            const statusCfg = STATUS_CONFIG[group.status];
            const isExpanded = expandedGroup === group.id;
            const totalPoints = group.members.reduce((s, m) => s + m.points, 0);

            return (
              <Card key={group.id} className="bg-card border-border">
                <CardHeader className="pb-2">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() =>
                      setExpandedGroup(isExpanded ? null : group.id)
                    }
                  >
                    <div className="flex items-center gap-3">
                      {state && (
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                          style={{ backgroundColor: state.color }}
                        >
                          {state.abbreviation}
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-sm">
                          {state?.name ?? group.stateId}{" "}
                          {species?.name ?? group.speciesId} — {group.year}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.color}`}
                          >
                            {statusCfg.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {group.members.length} members • {totalPoints} total
                            pts
                          </span>
                        </div>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-4">
                    {/* Members */}
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Party Members
                      </h4>
                      <div className="space-y-2">
                        {group.members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-secondary/50"
                          >
                            <div className="flex items-center gap-2">
                              {member.role === "leader" && (
                                <Shield className="w-3.5 h-3.5 text-primary" />
                              )}
                              <span className="text-sm">{member.name}</span>
                              {member.status === "invited" && (
                                <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                                  <Clock className="w-3 h-3" /> Invited
                                </span>
                              )}
                              {member.status === "accepted" && (
                                <Check className="w-3 h-3 text-green-400" />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold">
                                {member.points} pts
                              </span>
                              {member.id !== "me" && (
                                <button
                                  onClick={() =>
                                    removeMember(group.id, member.id)
                                  }
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Invite */}
                    <div className="flex items-center gap-2">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="Invite by email..."
                        className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:border-primary focus:outline-none"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => inviteMember(group.id)}
                        disabled={!inviteEmail.trim()}
                      >
                        <UserPlus className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Notes */}
                    {group.notes && (
                      <p className="text-xs text-muted-foreground italic">
                        {group.notes}
                      </p>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
            role="presentation"
          />
          <Card className="relative z-10 w-full max-w-md bg-card border-border shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">New Group Application</CardTitle>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  State
                </label>
                <select
                  value={newStateId}
                  onChange={(e) => setNewStateId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:border-primary focus:outline-none"
                >
                  <option value="">Select state...</option>
                  {Object.values(STATES_MAP).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Species
                </label>
                <select
                  value={newSpeciesId}
                  onChange={(e) => setNewSpeciesId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:border-primary focus:outline-none"
                >
                  <option value="">Select species...</option>
                  {Object.values(SPECIES_MAP).map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Year
                </label>
                <input
                  type="number"
                  value={newYear}
                  onChange={(e) => setNewYear(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Notes (optional)
                </label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Hunt strategy, meeting plans, etc."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:border-primary focus:outline-none resize-none"
                />
              </div>
              <Button
                onClick={createGroup}
                className="w-full"
                disabled={!newStateId || !newSpeciesId}
              >
                Create Group
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
