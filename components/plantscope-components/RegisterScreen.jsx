import React, { useState } from 'react';
import { View, TextInput, Button, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, firestore } from './firebase.client'; 
import { doc, setDoc } from 'firebase/firestore'; 

const RegisterScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        try {
        setLoading(true);
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        await setDoc(doc(firestore, 'users', uid), {
            username: username,
            email: email,
        });

        Alert.alert('Success', 'Registration complete! You can now log in.');
        navigation.navigate('FriendsScreen'); 
        } catch (error) {
        Alert.alert('Registration Failed', error.message);
        } finally {
        setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
        <TextInput
            style={styles.input}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
        />
        <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
        />
        <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
        />
        {loading ? (
            <ActivityIndicator size="large" color="#74cc60" />
        ) : (
            <Button title="Register" onPress={handleRegister} />
        )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { padding: 20 },
    input: { height: 40, borderColor: '#ccc', borderWidth: 1, marginBottom: 10, padding: 10 },
});

export default RegisterScreen;
