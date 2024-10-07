import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, TouchableOpacity, StyleSheet } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth, firestore, doc, getDocs } from './firebase.client';
import { collection, getDoc } from 'firebase/firestore';

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

        const fetchFriends = async () => {
            try {
                const friendsCollection = collection(firestore, 'users', userId, 'friends');
                const friendsSnapshot = await getDocs(friendsCollection);

                const friendsList = friendsSnapshot.docs.map((doc) => doc.data());
                setFriends(friendsList);
            } catch (error) {
                console.error("Error fetching friends: ", error.message);
            }
        };

        fetchUserInfo(); 
        fetchFriends();
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
        navigation.navigate('FriendDetailScreen', { friend });
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
        
        <Button title="Add New Friend" onPress={() => navigation.navigate('SearchScreen', { userId })} />
        <Button title="Sign Out" onPress={handleSignOut} color="red" />
        
        <FlatList
            data={friends}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleFriendPress(item)}>
                <View style={styles.friendItem}>
                <Text>{item.username}</Text>
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
    friendItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderColor: '#ccc',
        marginBottom: 10,
    },
});

export default FriendsListScreen;
