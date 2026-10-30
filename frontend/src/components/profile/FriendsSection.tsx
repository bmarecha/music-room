import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { VisibilityPicker } from './VisibilityPicker';
import { profileService, type Friend, type VisibilityLevel } from './profile.service';

interface FriendsSectionProps {
  friends: Friend[];
  initialVisibility: VisibilityLevel;
  isEditable?: boolean;
  onSuccess: () => void;
}

export function FriendsSection({
  friends,
  initialVisibility,
  isEditable = true,
  onSuccess,
}: FriendsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [visibility, setVisibility] = useState<VisibilityLevel>(initialVisibility);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleStartEdit = () => {
    setVisibility(initialVisibility);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setVisibility(initialVisibility);
    setIsEditing(false);
  };

  const handleSaveVisibility = async () => {
    setSavingVisibility(true);
    try {
      await profileService.update({ friends_visibility: visibility });
      setIsEditing(false);
      onSuccess();
    } catch (err) {
      console.error('[FriendsSection] save visibility failed:', err);
    } finally {
      setSavingVisibility(false);
    }
  };

  const handleDeleteFriend = async (friendId: number) => {
    setDeletingId(friendId);
    try {
      await profileService.deleteFriend(friendId);
      onSuccess();
    } catch (err) {
      console.error('[FriendsSection] delete friend failed:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewProfile = (friendId: number) => {
    router.push({
      pathname: '/profile',
      params: { userId: String(friendId) },
    });
  };

  const hasVisibilityChange = visibility !== initialVisibility;

  const visibilityLabelMap: Record<VisibilityLevel, string> = {
    public: 'Public',
    friends: 'Amis uniquement',
    private: 'Privé',
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Amis ({friends.length})</Text>
        {isEditable && (
          <View style={styles.headerActions}>
            {isEditing ? (
              <>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={handleCancel}
                  disabled={savingVisibility}
                >
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.actionBtn,
                    (!hasVisibilityChange || savingVisibility) && styles.btnDisabled,
                  ]}
                  onPress={handleSaveVisibility}
                  disabled={savingVisibility || !hasVisibilityChange}
                >
                  {savingVisibility ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.actionBtnText}>Enregistrer</Text>
                  )}
                </Pressable>
              </>
            ) : (
              <Pressable style={styles.actionBtn} onPress={handleStartEdit}>
                <Text style={styles.actionBtnText}>Modifier</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {isEditing && isEditable ? (
        <View style={styles.editSection}>
          <VisibilityPicker
            label="Visibilité de la liste d'amis"
            value={visibility}
            onChange={setVisibility}
          />
        </View>
      ) : (
        isEditable && (
          <View style={styles.visibilityBadge}>
            <Text style={styles.visibilityBadgeText}>
              Visibilité : {visibilityLabelMap[initialVisibility]}
            </Text>
          </View>
        )
      )}

      {friends.length === 0 ? (
        <Text style={styles.emptyText}>
          {isEditable ? 'Aucun ami pour le moment' : 'Aucun ami visible'}
        </Text>
      ) : (
        <View style={styles.scrollWrapper}>
          <ScrollView style={styles.scrollView} nestedScrollEnabled showsVerticalScrollIndicator>
            {friends.map((friend) => (
              <View key={friend.id} style={styles.friendRow}>
                <Pressable style={styles.friendInfo} onPress={() => handleViewProfile(friend.id)}>
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>
                      {friend.public_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.friendTextCol}>
                    <Text style={styles.friendName}>{friend.public_name}</Text>
                    {friend.bio ? (
                      <Text style={styles.friendBio} numberOfLines={1}>
                        {friend.bio}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>

                {isEditable && (
                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteFriend(friend.id)}
                    disabled={deletingId === friend.id}
                  >
                    {deletingId === friend.id ? (
                      <ActivityIndicator color="#ff4d4f" size="small" />
                    ) : (
                      <Text style={styles.deleteBtnText}>Supprimer</Text>
                    )}
                  </Pressable>
                )}
              </View>
            ))}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    backgroundColor: '#6C47FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 75,
  },
  btnDisabled: {
    backgroundColor: '#b5a3ff',
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  cancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelBtnText: {
    color: '#666',
    fontWeight: '500',
    fontSize: 13,
  },
  editSection: {
    gap: 8,
  },
  visibilityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f2f0ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  visibilityBadgeText: {
    color: '#6C47FF',
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
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: '#f4f4f4',
    height: 52,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e6e0ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#6C47FF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  friendTextCol: {
    flex: 1,
  },
  friendName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  friendBio: {
    fontSize: 12,
    color: '#777',
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
