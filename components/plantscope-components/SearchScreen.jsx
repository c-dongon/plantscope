import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, FlatList, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { firestore } from './firebase.client'; 
import { collection, query, where, getDocs, setDoc, doc, getDoc, deleteDoc } from 'firebase/firestore'; 

const SearchScreen = ({ navigation, route }) => {
    const [queryText, setQueryText] = useState('');
    const [results, setResults] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const { userId } = route.params; 

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

    const handleAcceptFriendRequest = async (requesterId) => {
        try {
            const userFriendRef = doc(firestore, 'users', userId, 'friends', requesterId);
            const requesterFriendRef = doc(firestore, 'users', requesterId, 'friends', userId);

            await setDoc(userFriendRef, { friendId: requesterId });
            await setDoc(requesterFriendRef, { friendId: userId });

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
        />
        <Button title="Search" onPress={handleSearch} />

        <Text style={styles.heading}>Search Results</Text>
        <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleSendFriendRequest(item.id)}>
                <View style={styles.resultItem}>
                    <Text>{item.username}</Text>
                </View>
            </TouchableOpacity>
            )}
        />

        <Text style={styles.heading}>Friend Requests</Text>
        <FlatList
            data={friendRequests}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleAcceptFriendRequest(item.requesterId)}>
                <View style={styles.resultItem}>
                    <Text>{item.requesterUsername} has sent you a friend request.</Text>
                    <Button title="Accept" onPress={() => handleAcceptFriendRequest(item.requesterId)} />
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
    input: {
        borderBottomWidth: 1,
        marginBottom: 20,
    },
    resultItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderColor: '#ccc',
        marginBottom: 10,
    },
    heading: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
    },
});

export default SearchScreen;
