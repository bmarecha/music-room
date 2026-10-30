import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { profileService, type FriendInvite } from './profile.service';

interface FriendInvitesSectionProps {
  invites: FriendInvite[];
  onSuccess: () => void;
}

export function FriendInvitesSection({ invites, onSuccess }: FriendInvitesSectionProps) {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [pseudonym, setPseudonym] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

  const handleToggleForm = () => {
    setShowInviteForm((prev) => !prev);
    setPseudonym('');
    setErrorMessage(null);
  };

  const handleSendInvite = async () => {
    const cleanName = pseudonym.trim();
    if (!cleanName) return;

    setSending(true);
    setErrorMessage(null);
    try {
      await profileService.sendInvite(cleanName);
      setPseudonym('');
      setShowInviteForm(false);
      onSuccess();
    } catch (err: unknown) {
      console.error('[FriendInvitesSection] send invite failed:', err);
      const msg =
        err instanceof Error
          ? err.message
          : "Impossible d'envoyer l'invitation. Vérifiez le pseudonyme.";
      setErrorMessage(
        msg.includes('404') || msg.toLowerCase().includes('not found')
          ? 'Utilisateur introuvable avec ce pseudonyme.'
          : msg,
      );
    } finally {
      setSending(false);
    }
  };

  const handleAcceptInvite = async (otherUserId: number) => {
    setLoadingActionId(`accept-${otherUserId}`);
    try {
      await profileService.acceptInvite(otherUserId);
      onSuccess();
    } catch (err) {
      console.error('[FriendInvitesSection] accept invite failed:', err);
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleDeleteInvite = async (otherUserId: number) => {
    setLoadingActionId(`delete-${otherUserId}`);
    try {
      await profileService.deleteInvite(otherUserId);
      onSuccess();
    } catch (err) {
      console.error('[FriendInvitesSection] delete invite failed:', err);
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleViewProfile = (otherUserId: number) => {
    router.push({
      pathname: '/profile',
      params: { userId: String(otherUserId) },
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Invitations ({invites.length})</Text>
        <Pressable style={styles.newInviteBtn} onPress={handleToggleForm}>
          <Text style={styles.newInviteBtnText}>
            {showInviteForm ? 'Fermer' : '+ Nouvelle invite'}
          </Text>
        </Pressable>
      </View>

      {showInviteForm && (
        <View style={styles.formContainer}>
          <Text style={styles.formLabel}>Inviter par pseudonyme ou email :</Text>
          <View style={styles.formRow}>
            <TextInput
              style={styles.input}
              value={pseudonym}
              onChangeText={(text) => {
                setPseudonym(text);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Pseudonyme ou email"
              placeholderTextColor="#aaa"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              style={[styles.sendBtn, (!pseudonym.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSendInvite}
              disabled={!pseudonym.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.sendBtnText}>Envoyer</Text>
              )}
            </Pressable>
          </View>
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        </View>
      )}

      {invites.length === 0 ? (
        <Text style={styles.emptyText}>Aucune invitation en attente</Text>
      ) : (
        <View style={styles.scrollWrapper}>
          <ScrollView style={styles.scrollView} nestedScrollEnabled showsVerticalScrollIndicator>
            {invites.map((invite) => {
              const isReceived = invite.direction === 'received';
              const isActing =
                loadingActionId === `accept-${invite.other_user_id}` ||
                loadingActionId === `delete-${invite.other_user_id}`;

              return (
                <View key={`${invite.direction}-${invite.other_user_id}`} style={styles.inviteRow}>
                  {/* Info area: clickable to view profile if received */}
                  <Pressable
                    style={styles.inviteInfo}
                    onPress={() => handleViewProfile(invite.other_user_id)}
                  >
                    {isReceived ? (
                        <View style={[styles.badge, styles.badgeReceived]}>
                          <Text style={styles.badgeTextReceived}>Reçue</Text>
                        </View>
                    ) : (
                        <View style={[styles.badge, styles.badgeSent]}>
                          <Text style={styles.badgeTextSent}>Envoyée</Text>
                        </View>
                    )}
                    <Text style={[styles.userName, styles.clickableName]}>{invite.other_user_name}</Text>
                  </Pressable>

                  {/* Actions */}
                  <View style={styles.actionsRow}>
                    {isReceived && (
                      <Pressable
                        style={styles.acceptBtn}
                        onPress={() => handleAcceptInvite(invite.other_user_id)}
                        disabled={isActing}
                      >
                        {loadingActionId === `accept-${invite.other_user_id}` ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.acceptBtnText}>Accepter</Text>
                        )}
                      </Pressable>
                    )}

                    <Pressable
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteInvite(invite.other_user_id)}
                      disabled={isActing}
                    >
                      {loadingActionId === `delete-${invite.other_user_id}` ? (
                        <ActivityIndicator color="#ff4d4f" size="small" />
                      ) : (
                        <Text style={styles.deleteBtnText}>
                          {isReceived ? 'Refuser' : 'Annuler'}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    gap: 12,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },
  newInviteBtn: {
    backgroundColor: '#6C47FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  newInviteBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  formContainer: {
    backgroundColor: '#f9f8ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e8e4ff',
    gap: 8,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
  },
  formRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#111',
    fontSize: 14,
    backgroundColor: '#fff',
  },
  sendBtn: {
    backgroundColor: '#6C47FF',
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#b5a3ff',
  },
  sendBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  errorText: {
    color: '#ff4d4f',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyText: {
    color: '#888',
    fontStyle: 'italic',
    fontSize: 14,
  },
  scrollWrapper: {
    maxHeight: 260, // Displays ~5 items smoothly
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  scrollView: {
    maxHeight: 260,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: '#f4f4f4',
    height: 52,
  },
  inviteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeReceived: {
    backgroundColor: '#f2f0ff',
    borderColor: '#d3caff',
  },
  badgeTextReceived: {
    color: '#6C47FF',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeSent: {
    backgroundColor: '#fff7e6',
    borderColor: '#ffd591',
  },
  badgeTextSent: {
    color: '#d46b08',
    fontSize: 11,
    fontWeight: '700',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  clickableName: {
    color: '#6C47FF',
    textDecorationLine: 'underline',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  acceptBtn: {
    backgroundColor: '#52c41a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  acceptBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#fff1f0',
    borderWidth: 1,
    borderColor: '#ffccc7',
  },
  deleteBtnText: {
    color: '#ff4d4f',
    fontSize: 12,
    fontWeight: '600',
  },
});
