import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, firestore } from './firebase.client';
import { collection, getDocs } from 'firebase/firestore';  

const CollectionScreen = ({ navigation }) => {
 	const [collectionData, setCollectionData] = useState([]);

	useFocusEffect(
		React.useCallback(() => {
			const loadCollection = async () => {
				try {
					const userId = auth.currentUser ? auth.currentUser.uid : null;

					let plantList = [];
					if (userId) {
						const plantsCollectionRef = collection(firestore, 'users', userId, 'plants');
						const plantsSnapshot = await getDocs(plantsCollectionRef);
						plantList = plantsSnapshot.docs.map(doc => doc.data());
					}

					const storedCollection = await AsyncStorage.getItem('plantCollection');
					const localCollection = storedCollection ? JSON.parse(storedCollection) : [];
					
					const mergedCollection = [...localCollection, ...plantList.filter(
						fbPlant => !localCollection.some(localPlant => localPlant.plantInfo.species.scientificName === fbPlant.plantInfo.species.scientificName)
					)];

					setCollectionData(mergedCollection);
				} catch (error) {
					console.error('Error loading collection:', error);
				}
			};

			loadCollection();
		}, [])
	);

  const handlePlantPress = (plant) => {
    navigation.navigate('PlantDetails', { plant });
  };

  const renderPlantItem = ({ item }) => (
    <TouchableOpacity onPress={() => handlePlantPress(item)} style={styles.itemContainer}>
		<Image source={{ uri: item.imageUri }} style={styles.plantImage} />
		<View style={styles.textContainer}>
			{item.plantInfo.species.commonNames && (
				<Text style={styles.commonName}>{item.plantInfo.species.commonNames[0]}</Text>
			)}
			<Text style={styles.plantName}>{item.plantInfo.species.scientificName}</Text>
		</View>
		<Icon name="chevron-forward" size={24} color="gray" style={styles.arrowIcon} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
		{collectionData.length > 0 ? (
			<>
			<Text style={styles.totalCountText}>Plants found: {collectionData.length}</Text>
			<FlatList
				data={collectionData}
				renderItem={renderPlantItem}
				keyExtractor={(item, index) => index.toString()}
			/>
			</>
		) : (
			<Text style={styles.noPlantsText}>No plants in your collection yet.</Text>
		)}
    </View>
  );
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 10,
	},
	totalCountText: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 10,
		textAlign: 'center',
	},
	itemContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#ddd',
	},
	plantImage: {
		width: 80,
		height: 80,
		borderRadius: 10,
		marginRight: 10,
	},
	textContainer: {
		flex: 1,
	},
	plantName: {
		fontSize: 14,
		color: 'gray',
	},
	commonName: {
		fontWeight: 'bold',
		fontSize: 16,
	},
	arrowIcon: {
		marginLeft: 'auto',
	},
	noPlantsText: {
		textAlign: 'center',
		fontSize: 18,
		marginTop: 20,
	},
});

export default CollectionScreen;
