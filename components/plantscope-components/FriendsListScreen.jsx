import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, TouchableOpacity, StyleSheet } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth, firestore, doc } from './firebase.client';
import { collection, getDocs, getDoc, onSnapshot } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/Ionicons';

const FriendsListScreen = ({ route, navigation }) => {
    const { userId } = route.params || {};  
    const [friends, setFriends] = useState([]);
    const [userInfo, setUserInfo] = useState(null);

    useEffect(() => {
        if (!userId) {
            navigation.reset({
                index: 0,
                routes: [{ name: 'FriendsScreen' }],
            });
            return;
        }

        const fetchUserInfo = async () => {
            try {
                const userDocRef = doc(firestore, 'users', userId);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    setUserInfo(userDoc.data());
                } else {
                    console.error("User does not exist");
                }
            } catch (error) {
                console.error("Error fetching user info: ", error.message);
            }
        };

        const fetchFriends = () => {
            const friendsCollection = collection(firestore, 'users', userId, 'friends');

            const unsubscribe = onSnapshot(friendsCollection, async (snapshot) => {
                const friendsList = await Promise.all(
                    snapshot.docs.map(async (doc) => {
                        const friendData = doc.data();
                        const friendId = friendData.friendId;
                        const username = friendData.username || 'Unknown';
                        
                        const plantsCollection = collection(firestore, 'users', friendId, 'plants');
                        const plantsSnapshot = await getDocs(plantsCollection);
                        const plantsCollected = plantsSnapshot.size;

                        return {
                            friendId,
                            username,
                            plantsCollected,
                        };
                    })
                );
                setFriends(friendsList);
            });

            return unsubscribe;
        };

        fetchUserInfo();
        const unsubscribe = fetchFriends(); 

        return () => unsubscribe(); 
    }, [userId]);

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            navigation.reset({
                index: 0,
                routes: [{ name: 'FriendsScreen' }],
            });
        } catch (error) {
            console.error("Sign out failed: ", error.message);
        }
    };

    const handleFriendPress = (friend) => {
        navigation.navigate('FriendDetailScreen', { 
            friend: {
                friendId: friend.friendId, 
                username: friend.username 
            } 
        });
    };

    return (
        <View style={styles.container}>
            {userInfo ? (
                <View style={styles.userInfo}>
                    <Text style={styles.username}>{userInfo.username}</Text>
                    <Text style={styles.email}>{userInfo.email}</Text>
                </View>
            ) : (
                <Text>Loading user information...</Text>
            )}
            
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('SearchScreen', { userId })}>
                    <Icon name="person-add-outline" size={20} color="white" />
                    <Text style={styles.buttonText}>Add New Friend</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, { backgroundColor: 'red' }]} onPress={handleSignOut}>
                    <Icon name="log-out-outline" size={20} color="white" />
                    <Text style={styles.buttonText}>Sign Out</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={friends}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => handleFriendPress(item)}>
                        <View style={styles.itemContainer}>
                            <Text style={styles.boldName}>{item.username}   </Text>
                            <Text style={styles.collectedItems}>Plants Collected: {item.plantsCollected}</Text>
                            <Icon name="chevron-forward" size={24} color="gray" style={styles.arrowIcon} />
                        </View>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    userInfo: {
        marginBottom: 20,
    },
    username: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    email: {
        fontSize: 16,
        color: 'gray',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 20,
    },
	itemContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#ddd',
	},
	arrowIcon: {
		marginLeft: 'auto',
	},
    boldName: {
		fontWeight: 'bold',
		fontSize: 16,
    },
    collectedItems: {
		fontSize: 14,
		color: 'gray',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#5bc443', 
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 10,
    },
    buttonText: {
        color: 'white',
        marginLeft: 5,
        fontSize: 16,
    },
});


export default FriendsListScreen;
