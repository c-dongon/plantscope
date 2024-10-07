import React, { useEffect, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { firestore } from './firebase.client';

const FriendDetailScreen = ({ route }) => {
    const { friend } = route.params;
    const [plants, setPlants] = useState([]);

    useEffect(() => {
        const fetchFriendPlants = async () => {
            try {
                const plantsCollection = collection(firestore, 'users', friend.friendId, 'plants');
                const plantsSnapshot = await getDocs(plantsCollection);
                const plantList = plantsSnapshot.docs.map(doc => doc.data());
                setPlants(plantList);
            } catch (error) {
                console.error('Error fetching plants:', error);
            }
        };

        fetchFriendPlants();
    }, [friend.friendId]);

  return (
    <View>
        <Text>{friend.username}'s Collection</Text>
        <FlatList
            data={plants}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
            <View>
                <Text>{item.plantInfo.species.commonNames[0]}</Text>
                <Text>{item.plantInfo.species.scientificName}</Text>
            </View>
            )}
        />
    </View>
  );
};

export default FriendDetailScreen;
