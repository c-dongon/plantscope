import React from 'react';
import { View, Text, Image, Button, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PlantDetailsScreen = ({ route, navigation }) => {
	const { plant } = route.params;

	const handleRemovePlant = async () => {
		try {
			const storedCollection = await AsyncStorage.getItem('plantCollection');
			if (storedCollection) {
				const updatedCollection = JSON.parse(storedCollection).filter(
					(item) => item.plantInfo.species.scientificName !== plant.plantInfo.species.scientificName
				);
				await AsyncStorage.setItem('plantCollection', JSON.stringify(updatedCollection));
				Alert.alert('Success', 'Plant removed from your collection.');
				navigation.goBack();
			}
		} catch (error) {
		console.error('Error removing plant:', error);
		}
	};

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
        {/* plantnetapi info */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
            <Button title="‹ Back to Collection" onPress={() => navigation.goBack()} />
            <Button title="Remove Plant" onPress={handleRemovePlant} />
        </View>
        <Text>Plant: {plant.plantInfo.species.scientificName}</Text>
        <Text>Family: {plant.plantInfo.species.family.scientificName}</Text>
        <Text>Common Name: {plant.plantInfo.species.commonNames[0]}</Text>
        <Text>Genus: {plant.plantInfo.species.genus.scientificName}</Text>

        {/* submitted image */}
        <Text>Submitted Image:</Text>
        {plant.imageUri ? (
            <Image source={{ uri: plant.imageUri }} style={{ width: 300, height: 300 }} />
        ) : (
            <Text>No photo submitted.</Text>
        )}

        {/* wikipedia api info */}
        {plant.wikiPlantDetails && (
        <View>
            <Text>{plant.wikiPlantDetails.extract}</Text>
            {plant.wikiPlantDetails.imageUrl && (
              	<Image source={{ uri: plant.wikiPlantDetails.imageUrl }} style={{ width: 300, height: 300 }} />
            )}
        </View>
        )}
    </ScrollView>
    );
};

export default PlantDetailsScreen;
