-- Create app roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'customer');

-- Create profiles table for user data
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    phone TEXT,
    default_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'customer',
    UNIQUE (user_id, role)
);

-- Create menu categories table
CREATE TABLE public.menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create menu items table
CREATE TABLE public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.menu_categories(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    is_weekend_only BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create delivery settings table
CREATE TABLE public.delivery_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_fee DECIMAL(10,2) DEFAULT 10.00,
    is_delivery_enabled BOOLEAN DEFAULT true,
    is_pay_on_delivery_enabled BOOLEAN DEFAULT true,
    min_order_amount DECIMAL(10,2) DEFAULT 0,
    opening_time TIME DEFAULT '10:00:00',
    closing_time TIME DEFAULT '22:00:00',
    delivery_area TEXT DEFAULT 'Tamale',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    delivery_address TEXT,
    order_type TEXT NOT NULL CHECK (order_type IN ('delivery', 'pickup')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled')),
    subtotal DECIMAL(10,2) NOT NULL,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('mtn', 'vodafone', 'airteltigo', 'pay_on_delivery')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
    special_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order items table
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    special_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Menu categories policies (public read, admin write)
CREATE POLICY "Anyone can view active categories" ON public.menu_categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can view all categories" ON public.menu_categories
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage categories" ON public.menu_categories
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Menu items policies (public read, admin write)
CREATE POLICY "Anyone can view available items" ON public.menu_items
    FOR SELECT USING (is_available = true);

CREATE POLICY "Admins can view all items" ON public.menu_items
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage items" ON public.menu_items
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Delivery settings policies (public read, admin write)
CREATE POLICY "Anyone can view delivery settings" ON public.delivery_settings
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage delivery settings" ON public.delivery_settings
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Orders policies
CREATE POLICY "Users can view own orders" ON public.orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create orders" ON public.orders
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all orders" ON public.orders
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update orders" ON public.orders
    FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Order items policies
CREATE POLICY "Users can view own order items" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can insert order items" ON public.order_items
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all order items" ON public.order_items
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at
    BEFORE UPDATE ON public.menu_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_settings_updated_at
    BEFORE UPDATE ON public.delivery_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'customer');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Insert default delivery settings
INSERT INTO public.delivery_settings (delivery_fee, is_delivery_enabled, is_pay_on_delivery_enabled, opening_time, closing_time, delivery_area)
VALUES (10.00, true, true, '10:00:00', '22:00:00', 'Tamale');

-- Insert default menu categories
INSERT INTO public.menu_categories (name, description, sort_order) VALUES
    ('Fried Rice & Jollof Rice', 'Delicious rice dishes', 1),
    ('Indomie & Plain Rice', 'Quick and tasty noodles and rice', 2),
    ('Chicken Wings & Spring Rolls', 'Crispy appetizers', 3),
    ('Fufu & Banku', 'Traditional Ghanaian staples', 4),
    ('TZ & Rice Balls', 'Northern delicacies', 5),
    ('Soups', 'Flavorful Ghanaian soups', 6),
    ('Proteins', 'Meat and fish options', 7),
    ('Street Dishes', 'Popular street food favorites', 8);

-- Insert sample menu items
INSERT INTO public.menu_items (category_id, name, description, price, is_available, is_weekend_only) VALUES
    ((SELECT id FROM public.menu_categories WHERE name = 'Fried Rice & Jollof Rice'), 'Jollof Rice', 'Classic Ghanaian jollof rice with tomato sauce', 25.00, true, false),
    ((SELECT id FROM public.menu_categories WHERE name = 'Fried Rice & Jollof Rice'), 'Special Fried Rice', 'Fried rice with vegetables and egg', 30.00, true, false),
    ((SELECT id FROM public.menu_categories WHERE name = 'Fried Rice & Jollof Rice'), 'Jollof with Chicken', 'Jollof rice served with grilled chicken', 45.00, true, false),
    ((SELECT id FROM public.menu_categories WHERE name = 'Indomie & Plain Rice'), 'Indomie Special', 'Indomie noodles with egg and vegetables', 20.00, true, false),
    ((SELECT id FROM public.menu_categories WHERE name = 'Indomie & Plain Rice'), 'Plain Rice with Stew', 'Steamed rice with tomato stew', 22.00, true, false),
    ((SELECT id FROM public.menu_categories WHERE name = 'Chicken Wings & Spring Rolls'), 'Crispy Chicken Wings', '6 pieces of crispy fried chicken wings', 35.00, true, false),
    ((SELECT id FROM public.menu_categories WHERE name = 'Chicken Wings & Spring Rolls'), 'Spring Rolls', '4 pieces of vegetable spring rolls', 15.00, true, false),
    ((SELECT id FROM public.menu_categories WHERE name = 'Fufu & Banku'), 'Fufu with Light Soup', 'Pounded fufu with light soup', 40.00, true, true),
    ((SELECT id FROM public.menu_categories WHERE name = 'Fufu & Banku'), 'Banku with Tilapia', 'Fermented corn dough with grilled tilapia', 50.00, true, true),
    ((SELECT id FROM public.menu_categories WHERE name = 'TZ & Rice Balls'), 'TZ with Ayoyo Soup', 'Northern TZ with traditional soup', 35.00, true, false),
    ((SELECT id FROM public.menu_categories WHERE name = 'TZ & Rice Balls'), 'Rice Balls with Groundnut Soup', 'Omo tuo with rich groundnut soup', 45.00, true, true),
    ((SELECT id FROM public.menu_categories WHERE name = 'Soups'), 'Light Soup', 'Traditional Ghanaian light soup', 20.00, true, false),
    ((SELECT id FROM public.menu_categories WHERE name = 'Soups'), 'Groundnut Soup', 'Rich and creamy groundnut soup', 25.00, true, false),
    ((SELECT id FROM public.menu_categories WHERE name = 'Soups'), 'Palm Nut Soup', 'Traditional palm nut soup', 25.00, true, false),
    ((SELECT id FROM public.menu_categories WHERE name = 'Proteins'), 'Grilled Chicken', 'Whole grilled chicken', 60.00, true, false),
    ((SELECT id FROM public.menu_categories WHERE name = 'Proteins'), 'Grilled Tilapia', 'Fresh grilled tilapia fish', 55.00, true, false),
    ((SELECT id FROM public.menu_categories WHERE name = 'Proteins'), 'Beef Kebab', '4 sticks of seasoned beef kebab', 30.00, true, false),
    ((SELECT id FROM public.menu_categories WHERE name = 'Street Dishes'), 'Waakye', 'Rice and beans with spaghetti and shito', 25.00, true, false),
    ((SELECT id FROM public.menu_categories WHERE name = 'Street Dishes'), 'Kelewele', 'Spicy fried plantains', 15.00, true, false),
    ((SELECT id FROM public.menu_categories WHERE name = 'Street Dishes'), 'Red Red', 'Fried plantains with beans stew', 28.00, true, false);