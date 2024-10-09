import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, FlatList, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { firestore } from './firebase.client'; 
import { collection, query, where, getDocs, setDoc, doc, getDoc, deleteDoc } from 'firebase/firestore'; 
import Icon from 'react-native-vector-icons/Ionicons';

const SearchScreen = ({ route }) => {
    const [queryText, setQueryText] = useState('');
    const [results, setResults] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [userInfo, setUserInfo] = useState(null); 
    const { userId } = route.params;

    const fetchUserInfo = async () => {
        try {
            const userDocRef = doc(firestore, 'users', userId);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                setUserInfo(userDoc.data()); 
            } else {
                console.error('User does not exist');
            }
        } catch (error) {
            console.error('Error fetching user info:', error.message);
        }
    };

    const fetchFriendRequests = async () => {
        try {
            const requestsCollection = collection(firestore, 'users', userId, 'friendRequests');
            const requestsSnapshot = await getDocs(requestsCollection);

            const requestsList = await Promise.all(
                requestsSnapshot.docs.map(async (requestDoc) => {
                const requestData = requestDoc.data();
                const requesterDocRef = doc(firestore, 'users', requestData.requesterId);
                const requesterDoc = await getDoc(requesterDocRef); 

                return {
                    id: requestDoc.id,
                    requesterId: requestData.requesterId,
                    requesterUsername: requesterDoc.exists() ? requesterDoc.data().username : 'Unknown',  
                };
                })
            );

            setFriendRequests(requestsList);
        } catch (error) {
            console.error('Error fetching friend requests:', error.message);
        }
    };

    useEffect(() => {
        fetchUserInfo(); 
        fetchFriendRequests();
    }, []);

    const handleSearch = async () => {
        try {
            const usersCollection = collection(firestore, 'users');
            const usersQuery = query(usersCollection, where('username', '>=', queryText), where('username', '<=', queryText + '\uf8ff'));
            const usersSnapshot = await getDocs(usersQuery);

            const usersList = usersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            setResults(usersList);
        } catch (error) {
            console.error('Error searching for users:', error.message);
        }
    };

    const handleSendFriendRequest = async (friendId) => {
        if (friendId === userId) {
            alert('You cannot add yourself as a friend.');
            return;
        }
        try {
            const friendRequestRef = doc(firestore, 'users', friendId, 'friendRequests', userId);
            await setDoc(friendRequestRef, { requesterId: userId });
            alert('Friend request sent!');
        } catch (error) {
            console.error('Error sending friend request:', error.message);
        }
    };

    const handleAcceptFriendRequest = async (requesterId, requesterUsername) => {
        try {
            if (!userInfo || !userInfo.username) {
                const userDocRef = doc(firestore, 'users', userId);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    setUserInfo(userDoc.data());
                } else {
                    throw new Error('Current user info is missing');
                }
            }

            if (!requesterUsername) {
                const requesterDocRef = doc(firestore, 'users', requesterId);
                const requesterDoc = await getDoc(requesterDocRef);
                if (requesterDoc.exists()) {
                    requesterUsername = requesterDoc.data().username || 'Unknown';
                } else {
                    throw new Error('Requester username is missing');
                }
            }

            const userFriendRef = doc(firestore, 'users', userId, 'friends', requesterId);
            const requesterFriendRef = doc(firestore, 'users', requesterId, 'friends', userId);

            await setDoc(userFriendRef, { friendId: requesterId, username: requesterUsername });
            await setDoc(requesterFriendRef, { friendId: userId, username: userInfo.username }); 

            const requestDocRef = doc(firestore, 'users', userId, 'friendRequests', requesterId);
            await deleteDoc(requestDocRef);

            alert('Friend request accepted!');
            fetchFriendRequests();  
        } catch (error) {
            console.error('Error accepting friend request:', error.message);
        }
    };

    return (
        <View style={styles.container}>
        <TextInput
            placeholder="Search by username"
            value={queryText}
            onChangeText={setQueryText}
            style={styles.input}
            placeholderTextColor="#888" 
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Icon name="search" size={20} color="white" style={styles.searchIcon} />
            <Text style={styles.searchButtonText}> Search </Text>
        </TouchableOpacity>

        <Text style={styles.heading}>Search Results</Text>
        <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleSendFriendRequest(item.id)}>
                <View style={styles.resultItem}>
                    <Text>{item.username}</Text>
                    <Icon name="person-add-outline" size={20} color="black" style={styles.addIcon} />
                </View>
            </TouchableOpacity>
            )}
        />

        <Text style={styles.heading}>Friend Requests</Text>
        <FlatList
            data={friendRequests}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleAcceptFriendRequest(item.requesterId, item.requesterUsername)}>
                <View>
                    <TouchableOpacity style={styles.resultItem} onPress={() => handleAcceptFriendRequest(item.requesterId, item.requesterUsername)} >
                        <Text>{item.requesterUsername} has sent you a friend request!</Text>
                        <Icon name="person-add-outline" size={20} color="black" style={styles.addIcon} />
                    </TouchableOpacity>
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
        backgroundColor: '#f5f5f5',
    },
    input: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        marginBottom: 15,
        backgroundColor: '#fff',
    },
    searchButton: {
        backgroundColor: '#5bc443',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        marginBottom: 20,
        borderWidth: 2,
        borderColor: 'green',
        shadowColor: '#000',
        shadowOffset: { height: 1 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 2,
    },
    searchButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    addIcon: {
        marginLeft: 'auto',
        marginRight: 5,
    },
    resultItem: {
        flexDirection: 'row',
        padding: 15,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0,
        shadowRadius: 4,
        elevation: 2,
        flexDirection: 'row'
    },

    heading: {
        fontSize: 18,
        fontWeight: 'bold',
        marginVertical: 10,
    },
});

export default SearchScreen;
